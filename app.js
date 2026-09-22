/* ==================================================================
   LOVABLEUNLIMITED — APP LOGIC
   Navegação, Termos, Checkout PIX real, Supabase Integration
   ================================================================== */

/* ------------------------------------------------------------------
   SUPABASE CONFIG
   ⚠️ SUBSTITUA ESTES VALORES PELOS DO SEU PROJETO SUPABASE
   ------------------------------------------------------------------ */
const SUPABASE_URL = 'https://yuktuarickwxohhyumyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a3R1YXJpY2t3eG9oaHl1bXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODcyNzcsImV4cCI6MjEwNTY2MzI3N30.yybJVLndcz2peNsdFPZ_8_L67np3cKl1MdwJV21AmUQ';

// Inicializa Supabase client
let supabaseClient;
try {
  supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
} catch (e) {
  console.warn('Supabase não carregado. Usando modo offline.');
  supabaseClient = null;
}

// URL do arquivo para download (substitua pelo link real do seu arquivo)
let DOWNLOAD_URL = 'lovableunlimited.zip';

const state = {
  view: 'home',
  name: '',
  proto: ''
};

/* ------------------------------------------------------------------
   NAVIGATION
   ------------------------------------------------------------------ */
function switchView(name) {
  document.querySelectorAll('.page-view').forEach(v => v.style.display = 'none');
  const el = document.getElementById('view' + name.charAt(0).toUpperCase() + name.slice(1));
  if (el) {
    el.style.display = 'block';
    state.view = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function goHome() {
  switchView('terms');
}

/* Mobile Menu */
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('active');
}

function closeMenu() {
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('hamburger').classList.remove('active');
}

/* ------------------------------------------------------------------
   SCROLL REVEAL
   ------------------------------------------------------------------ */
function initReveal() {
  const els = document.querySelectorAll('.reveal');

  // Fallback: immediately show elements already in viewport
  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('visible');
    }
  });

  // Observer for elements that scroll into view later
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

  els.forEach(el => {
    if (!el.classList.contains('visible')) {
      observer.observe(el);
    }
  });
}

/* ------------------------------------------------------------------
   SCROLLSPY (TERMS SIDEBAR)
   ------------------------------------------------------------------ */
function initScrollspy() {
  const sections = document.querySelectorAll('.t-section');
  const links = document.querySelectorAll('.sb-link');
  if (!sections.length) return;

  function onScroll() {
    let current = '';
    const y = window.scrollY + 130;
    sections.forEach(s => {
      if (y >= s.offsetTop && y < s.offsetTop + s.offsetHeight) {
        current = s.id;
      }
    });
    if (current) {
      links.forEach(l => l.classList.toggle('active', l.dataset.section === current));
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------------
   TERMS ACCEPTANCE
   ------------------------------------------------------------------ */
function initTerms() {
  const chkG = document.getElementById('chkG');
  const chkC = document.getElementById('chkC');
  const chkR = document.getElementById('chkR');
  const nameInput = document.getElementById('acceptName');
  const btn = document.getElementById('btnGoCheckout');
  const form = document.getElementById('termsForm');

  function validate() {
    const ok = chkG.checked && chkC.checked && chkR.checked && nameInput.value.trim().length >= 3;
    btn.disabled = !ok;
  }

  [chkG, chkC, chkR].forEach(c => c && c.addEventListener('change', validate));
  nameInput && nameInput.addEventListener('input', validate);

  form && form.addEventListener('submit', e => {
    e.preventDefault();
    if (btn.disabled) return;
    state.name = nameInput.value.trim();
    // Pre-fill checkout name
    const coName = document.getElementById('coName');
    if (coName) coName.value = state.name;
    switchView('checkout');
  });
}

/* ------------------------------------------------------------------
   CHECKOUT — PIX MANUAL
   ------------------------------------------------------------------ */
function copyPix() {
  const input = document.getElementById('pixStr');
  const btn = document.getElementById('btnCopyPix');
  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = 'Copiado!';
    btn.style.background = '#059669';
    setTimeout(() => { btn.textContent = 'Copiar'; btn.style.background = ''; }, 2000);
  });
}

function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function hideError(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.style.display = 'none';
}

function generateProtocol() {
  return 'EULA-' + Math.floor(100000 + Math.random() * 900000);
}

async function submitOrder() {
  const name = document.getElementById('coName').value.trim();
  const email = document.getElementById('coEmail').value.trim();
  const cpf = document.getElementById('coCpf').value.trim();

  hideError('coError');

  // Validação
  if (!name || name.length < 3) {
    showError('coError', 'Por favor, preencha seu nome completo.');
    return;
  }
  if (!email || !email.includes('@')) {
    showError('coError', 'Por favor, preencha um e-mail válido.');
    return;
  }
  if (!cpf || cpf.replace(/\D/g, '').length < 11) {
    showError('coError', 'Por favor, preencha um CPF válido.');
    return;
  }

  const btn = document.getElementById('btnFinalize');
  const spinner = document.getElementById('finSpinner');
  const text = document.getElementById('finText');

  btn.disabled = true;
  spinner.style.display = 'inline-block';
  text.textContent = 'Registrando pedido...';

  const protocol = generateProtocol();
  state.proto = protocol;
  state.name = name;

  try {
    if (supabaseClient && SUPABASE_URL !== 'https://SEU_PROJETO.supabase.co') {
      // Salvar no Supabase
      const planObj = (typeof PLANS !== 'undefined' && PLANS[selectedPlanKey]) ? PLANS[selectedPlanKey] : { id: 'vitalicio', name: 'Vitalício Ilimitado', category: 'Vitalício', duration: 'Vitalício', price: basePrice };
      const finalAmount = currentCoupon ? Math.max(0, planObj.price * (1 - currentCoupon.discount / 100)) : planObj.price;
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([{
          name: name,
          email: email,
          cpf: cpf.replace(/\D/g, ''),
          amount: finalAmount,
          status: 'pending',
          payment_status: 'pending',
          delivery_status: 'pending',
          protocol: protocol,
          delivery_type: planObj.id,
          delivery_payload: JSON.stringify({
            plan: planObj.name,
            category: planObj.category,
            duration: planObj.duration,
            price: planObj.price
          }),
          download_count: 0
        }]);

      if (!error && currentCoupon) {
        try { await supabaseClient.rpc('increment_coupon_uses', { p_code: currentCoupon.code }); } catch(e){}
      }
      if (!error) {
        try {
          await supabaseClient.from('logs').insert([{
            event_type: 'Checkout',
            user_email: email,
            description: `Novo pedido via PIX: ${planObj.name} (R$ ${finalAmount.toLocaleString('pt-BR',{minimumFractionDigits:2})})`,
            status: 'Sucesso'
          }]);
        } catch(e){}
      }

      if (error) {
        throw new Error(error.message);
      }
    } else {
      // Modo offline — simula delay
      await new Promise(r => setTimeout(r, 1000));
      console.log('📋 Pedido (modo offline):', { name, email, cpf, protocol, status: 'pending' });
    }

    // Exibir protocolo na tela de pendente (fallback)
    const protoEl = document.getElementById('pendingProto');
    if (protoEl) protoEl.textContent = protocol;

    // Preencher campo de consulta com o protocolo
    const statusProtoInput = document.getElementById('statusProto');
    if (statusProtoInput) statusProtoInput.value = protocol;

    // Redirecionar para a página de obrigado com confetes para rastreamento de anúncios
    window.location.href = `obrigado.html?proto=${encodeURIComponent(protocol)}&name=${encodeURIComponent(name)}`;
  } catch (err) {
    if (err.message.includes('row-level security')) {
      showError('coError', 'Você está logado como Admin e não pode fazer compras. Use uma aba anônima!');
    } else {
      showError('coError', 'Erro ao registrar pedido: ' + err.message);
    }
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    text.textContent = 'CONFIRMAR PAGAMENTO PIX';
  }
}

function copyProto() {
  const code = document.getElementById('pendingProto').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btns = document.querySelectorAll('#viewPending .btn-sm-purple');
    btns.forEach(b => { b.textContent = 'Copiado!'; setTimeout(() => b.textContent = 'Copiar', 2000); });
  });
}

/* ------------------------------------------------------------------
   STATUS CHECK
   ------------------------------------------------------------------ */
async function checkStatus() {
  const proto = document.getElementById('statusProto').value.trim().toUpperCase();
  hideError('statusError');

  if (!proto) {
    showError('statusError', 'Por favor, insira o protocolo do pedido.');
    return;
  }

  const btn = document.getElementById('btnCheckStatus');
  const spinner = document.getElementById('statusSpinner');
  const btnText = document.getElementById('statusBtnText');

  btn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.textContent = 'Consultando...';

  try {
    let order = null;

    if (supabaseClient && SUPABASE_URL !== 'https://SEU_PROJETO.supabase.co') {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('protocol', proto)
        .single();

      if (error || !data) {
        throw new Error('Pedido não encontrado. Verifique o protocolo.');
      }
      order = data;
    } else {
      // Modo offline — pedido demo
      await new Promise(r => setTimeout(r, 800));

      if (proto === state.proto) {
        order = {
          protocol: proto,
          name: state.name || 'Cliente Demo',
          email: 'demo@email.com',
          status: 'pending',
          created_at: new Date().toISOString()
        };
      } else {
        throw new Error('Pedido não encontrado. Verifique o protocolo.');
      }
    }

    // Preencher resultado
    document.getElementById('srProto').textContent = order.protocol;
    document.getElementById('srName').textContent = order.name;
    document.getElementById('srEmail').textContent = order.email;
    document.getElementById('srDate').textContent = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if(order.amount) {
      document.getElementById('srPrice').textContent = `R$ ${Number(order.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    } else {
      document.getElementById('srPrice').textContent = `R$ ${basePrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    }

    // Status badge
    const badge = document.getElementById('statusBadge');
    const srStatus = document.getElementById('srStatus');
    const downloadSection = document.getElementById('downloadSection');

    if (order.status === 'approved') {
      badge.className = 'status-badge badge-approved';
      badge.textContent = '✅ Pagamento Confirmado';
      srStatus.innerHTML = '<span class="tag-ok">Aprovado</span>';
      downloadSection.style.display = 'block';
      
      const licenseSection = document.getElementById('licenseSection');
      if (licenseSection) {
        if (order.license_key) {
           licenseSection.style.display = 'block';
           document.getElementById('srLicenseKey').value = order.license_key;
        } else {
           licenseSection.style.display = 'none';
        }
      }
    } else if (order.status === 'rejected') {
      badge.className = 'status-badge badge-rejected';
      badge.textContent = '❌ Pedido Rejeitado';
      srStatus.innerHTML = '<span style="color:var(--error);font-weight:700;">Rejeitado</span>';
      downloadSection.style.display = 'none';
    } else {
      badge.className = 'status-badge badge-pending';
      badge.textContent = '⏳ Aguardando Confirmação';
      srStatus.innerHTML = '<span style="color:var(--warning);font-weight:700;">Pendente</span>';
      downloadSection.style.display = 'none';
    }

    document.getElementById('statusResult').style.display = 'block';

  } catch (err) {
    showError('statusError', err.message);
    document.getElementById('statusResult').style.display = 'none';
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Consultar';
  }
}

function copyLicense() {
  const code = document.getElementById('srLicenseKey').value;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btnCopyLicense');
    btn.textContent = 'Copiado!';
    btn.style.background = '#059669';
    setTimeout(() => { btn.textContent = 'Copiar'; btn.style.background = ''; }, 2000);
  });
}

/* ------------------------------------------------------------------
   DOWNLOAD
   ------------------------------------------------------------------ */
async function downloadExtension() {
  // Incrementar download_count no Supabase
  const proto = document.getElementById('srProto').textContent;
  if (supabaseClient && SUPABASE_URL !== 'https://SEU_PROJETO.supabase.co') {
    try {
      await supabaseClient.rpc('increment_download', { p_protocol: proto });
    } catch (e) {
      console.warn('Não foi possível registrar download:', e);
    }
  }

  // Iniciar download
  const a = document.createElement('a');
  a.href = DOWNLOAD_URL;
  a.download = 'lovableunlimited.zip';
  a.click();
}

/* ------------------------------------------------------------------
   INPUT MASKS
   ------------------------------------------------------------------ */
function initMasks() {
  const cpf = document.getElementById('coCpf');

  cpf && cpf.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = v;
  });
}

/* ------------------------------------------------------------------
   INIT
   ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initScrollspy();
  initTerms();
  initMasks();

  const urlParams = new URLSearchParams(window.location.search);
  const protoParam = urlParams.get('proto');
  if (protoParam) {
    const statusProtoInput = document.getElementById('statusProto');
    if (statusProtoInput) statusProtoInput.value = protoParam;
    switchView('status');
    checkStatus();
  } else {
    switchView('terms');
  }

  loadDynamicSettings();
});

const PLANS = {
  vitalicio: { id: 'vitalicio', category: 'Vitalício', duration: 'Vitalício', price: 54.90, name: 'Vitalício Ilimitado' },
  pro_7d: { id: 'pro_7d', category: 'Pro', duration: '7 Dias', price: 23.90, name: 'Pro (7 Dias)' },
  pro_15d: { id: 'pro_15d', category: 'Pro', duration: '15 Dias', price: 28.90, name: 'Pro (15 Dias)' },
  pro_30d: { id: 'pro_30d', category: 'Pro', duration: '30 Dias', price: 36.90, name: 'Pro (30 Dias)' },
  basic_7d: { id: 'basic_7d', category: 'Basic', duration: '7 Dias', price: 10.90, name: 'Basic (7 Dias)' },
  basic_15d: { id: 'basic_15d', category: 'Basic', duration: '15 Dias', price: 14.90, name: 'Basic (15 Dias)' },
  basic_30d: { id: 'basic_30d', category: 'Basic', duration: '30 Dias', price: 19.90, name: 'Basic (30 Dias)' }
};

let selectedPlanKey = 'vitalicio';
let basePrice = 54.90;
let currentCoupon = null;

function selectPlan(planKey) {
  if (!PLANS[planKey]) return;
  selectedPlanKey = planKey;
  const plan = PLANS[planKey];
  basePrice = plan.price;

  const heroCard = document.getElementById('cardVitalicio');
  if (heroCard) heroCard.classList.toggle('active', planKey === 'vitalicio');

  document.querySelectorAll('.plan-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.plan === planKey);
  });

  const nameEl = document.getElementById('spSelectedPlan');
  if (nameEl) nameEl.textContent = plan.name;

  updateCheckoutPrice();
}

async function applyCoupon() {
  const input = document.getElementById('couponInput');
  const msg = document.getElementById('couponMsg');
  const code = input.value.trim().toUpperCase();
  if (!code) return;

  msg.textContent = 'Verificando...';
  msg.style.display = 'block';
  msg.style.color = 'inherit';

  try {
    if (!supabaseClient) throw new Error('Sistema de cupons offline.');
    const {data, error} = await supabaseClient.from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .single();
    
    if (error || !data) throw new Error('Cupom inválido ou expirado.');
    
    if (new Date(data.expires + 'T23:59:59') < new Date()) {
      throw new Error('Cupom expirado.');
    }
    if (data.uses >= data.limit) {
      throw new Error('Cupom esgotado.');
    }
    
    currentCoupon = data;
    msg.textContent = `Cupom aplicado! ${data.discount}% de desconto.`;
    msg.style.color = 'var(--primary)';
    
    updateCheckoutPrice();
  } catch (err) {
    currentCoupon = null;
    msg.textContent = err.message;
    msg.style.color = 'var(--error, #e11d48)';
    updateCheckoutPrice();
  }
}

function updateCheckoutPrice() {
  const formattedBase = basePrice.toLocaleString('pt-BR', {minimumFractionDigits:2});
  
  const subtotalSpans = document.querySelectorAll('.sl-subtotal');
  subtotalSpans.forEach(span => {
    span.textContent = `R$ ${formattedBase}`;
  });

  const couponEl = document.querySelector('.sl-coupon');
  const totalEls = document.querySelectorAll('.st-amt');
  
  if (currentCoupon) {
    const discountAmt = basePrice * (currentCoupon.discount / 100);
    const finalPrice = Math.max(0, basePrice - discountAmt);
    
    if (couponEl) {
      couponEl.style.display = 'flex';
      document.getElementById('couponDiscountValue').textContent = `−R$ ${discountAmt.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    }
    
    const formattedFinal = finalPrice.toLocaleString('pt-BR', {minimumFractionDigits:2});
    totalEls.forEach(e => e.textContent = formattedFinal);

    document.querySelectorAll('.pix-instruction').forEach(li => {
      li.innerHTML = `Cole o código na opção PIX Copia-e-Cola e pague R$ ${formattedFinal}`;
    });

    const srPriceEl = document.getElementById('srPrice');
    if (srPriceEl) srPriceEl.textContent = `R$ ${formattedFinal}`;
  } else {
    if (couponEl) couponEl.style.display = 'none';
    totalEls.forEach(e => e.textContent = formattedBase);
    
    document.querySelectorAll('.pix-instruction').forEach(li => {
      li.innerHTML = `Cole o código na opção PIX Copia-e-Cola e pague R$ ${formattedBase}`;
    });

    const srPriceEl = document.getElementById('srPrice');
    if (srPriceEl) srPriceEl.textContent = `R$ ${formattedBase}`;
  }
}

// Load settings dynamically
async function loadDynamicSettings() {
  if (supabaseClient && SUPABASE_URL !== 'https://SEU_PROJETO.supabase.co') {
    try {
      const { data, error } = await supabaseClient.from('settings').select('*').single();
      if (!error && data) {
        if (data.site_title) document.title = data.site_title;
        if (data.download_url) DOWNLOAD_URL = data.download_url;
        if (data.primary_color) {
          document.documentElement.style.setProperty('--primary', data.primary_color);
        }
        if (data.pix_key) {
          const pixEl = document.getElementById('pixStr');
          if (pixEl) pixEl.value = data.pix_key;
        }
        if (data.product_price) {
          PLANS.vitalicio.price = Number(data.product_price);
          if (selectedPlanKey === 'vitalicio') {
            basePrice = Number(data.product_price);
          }
          document.querySelectorAll('.sl-discount').forEach(el => el.style.display = 'none');
          updateCheckoutPrice();
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configs', err);
    }
  }
}
