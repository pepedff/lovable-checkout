/* ==================================================================
   LOVABLEUNLIMITED — VISUAL DELIVERY PAGE CUSTOMIZER
   ================================================================== */
'use strict';

const SUPABASE_URL = 'https://yuktuarickwxohhyumyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a3R1YXJpY2t3eG9oaHl1bXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODcyNzcsImV4cCI6MjEwNTY2MzI3N30.yybJVLndcz2peNsdFPZ_8_L67np3cKl1MdwJV21AmUQ';

let supabaseClient = null;
try {
  supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
} catch(e) {}

// Estado Padrão
const DEFAULT_CONFIG = {
  primaryColor: '#7c3aed',
  bgColor: '#fcfbfe',
  cardBgColor: '#ffffff',
  textColor: '#1e1b29',
  textSubColor: '#5d566b',
  btnBgColor: '#7c3aed',
  btnTextColor: '#ffffff',
  fontFamily: "'Inter', sans-serif",
  titleSize: 32,
  bodySize: 15,
  borderRadius: 28,
  maxWidth: 620,
  padding: 45,
  titleAwaiting: 'Pagamento aprovado!',
  subAwaiting: 'Seu pagamento foi confirmado com sucesso. Agora estamos preparando sua entrega.',
  titleDelivered: 'Tudo pronto! 🎉',
  subDelivered: 'Sua entrega foi concluída com sucesso. Aproveite seu acesso!',
  showLogo: true,
  showConfetti: true,
  showTimeline: true,
  showDeliveryCard: true,
  showOrderProto: true,
  showProductInfo: true,
  showDeliveredDate: true
};

let currentConfig = { ...DEFAULT_CONFIG };
let undoStack = [];
let redoStack = [];
let isUnsaved = false;
let previewState = 'delivered'; // 'awaiting', 'approved', 'delivered'
let loadedSettingsId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadPublishedConfig();
  syncInputsWithConfig();
  applyLivePreview();
  updateHistoryButtons();
});

// Carregar configuração salva do Supabase
async function loadPublishedConfig() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('settings').select('*').single();
    if (error || !data) return;

    loadedSettingsId = data.id;
    // Se existir rascunho ou configuração publicada, carrega
    const saved = data.delivery_page_draft || data.delivery_page_config;
    if (saved && typeof saved === 'object') {
      currentConfig = { ...DEFAULT_CONFIG, ...saved };
    }
  } catch(e) {
    console.warn('Configuração padrão carregada:', e);
  }
}

// Sincronizar inputs da sidebar com o estado
function syncInputsWithConfig() {
  document.getElementById('cfgPrimaryColor').value = currentConfig.primaryColor;
  document.getElementById('cfgPrimaryColorHex').value = currentConfig.primaryColor;
  document.getElementById('cfgBgColor').value = currentConfig.bgColor;
  document.getElementById('cfgBgColorHex').value = currentConfig.bgColor;
  document.getElementById('cfgCardBgColor').value = currentConfig.cardBgColor;
  document.getElementById('cfgCardBgColorHex').value = currentConfig.cardBgColor;
  document.getElementById('cfgTextColor').value = currentConfig.textColor;
  document.getElementById('cfgTextColorHex').value = currentConfig.textColor;
  document.getElementById('cfgTextSubColor').value = currentConfig.textSubColor;
  document.getElementById('cfgTextSubColorHex').value = currentConfig.textSubColor;
  document.getElementById('cfgBtnBgColor').value = currentConfig.btnBgColor;
  document.getElementById('cfgBtnBgColorHex').value = currentConfig.btnBgColor;

  document.getElementById('cfgFontFamily').value = currentConfig.fontFamily;
  document.getElementById('cfgTitleSize').value = currentConfig.titleSize;
  document.getElementById('valTitleSize').textContent = currentConfig.titleSize + 'px';
  document.getElementById('cfgBodySize').value = currentConfig.bodySize;
  document.getElementById('valBodySize').textContent = currentConfig.bodySize + 'px';

  document.getElementById('cfgBorderRadius').value = currentConfig.borderRadius;
  document.getElementById('valRadius').textContent = currentConfig.borderRadius + 'px';
  document.getElementById('cfgMaxWidth').value = currentConfig.maxWidth;
  document.getElementById('valMaxWidth').textContent = currentConfig.maxWidth + 'px';
  document.getElementById('cfgPadding').value = currentConfig.padding;
  document.getElementById('valPadding').textContent = currentConfig.padding + 'px';

  document.getElementById('cfgTitleAwaiting').value = currentConfig.titleAwaiting;
  document.getElementById('cfgSubAwaiting').value = currentConfig.subAwaiting;
  document.getElementById('cfgTitleDelivered').value = currentConfig.titleDelivered;
  document.getElementById('cfgSubDelivered').value = currentConfig.subDelivered;

  setSwitchUI('swLogo', currentConfig.showLogo);
  setSwitchUI('swConfetti', currentConfig.showConfetti);
  setSwitchUI('swTimeline', currentConfig.showTimeline);
  setSwitchUI('swDeliveryCard', currentConfig.showDeliveryCard);
  setSwitchUI('swOrderProto', currentConfig.showOrderProto);
  setSwitchUI('swProductInfo', currentConfig.showProductInfo);
  setSwitchUI('swDeliveredDate', currentConfig.showDeliveredDate);
}

// Alteração de valor com gravação no histórico de Undo
function updateConfig(key, value) {
  pushHistory();
  currentConfig[key] = value;
  markUnsaved();
  applyLivePreview();

  // Sincronizar hex se for cor
  const hexInput = document.getElementById('cfg' + key.charAt(0).toUpperCase() + key.slice(1) + 'Hex');
  if (hexInput) hexInput.value = value;
}

function updateConfigHex(key, hex) {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    pushHistory();
    currentConfig[key] = hex;
    markUnsaved();
    const picker = document.getElementById('cfg' + key.charAt(0).toUpperCase() + key.slice(1));
    if (picker) picker.value = hex;
    applyLivePreview();
  }
}

// Toggle Switches
function toggleSwitch(key, switchId) {
  pushHistory();
  currentConfig[key] = !currentConfig[key];
  setSwitchUI(switchId, currentConfig[key]);
  markUnsaved();
  applyLivePreview();
}

function setSwitchUI(id, isActive) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', !!isActive);
}

// Indicador de Alterações Salvas / Não Salvas
function markUnsaved() {
  isUnsaved = true;
  const ind = document.getElementById('saveStatusIndicator');
  const txt = document.getElementById('saveStatusText');
  ind.className = 'save-status unsaved';
  txt.textContent = 'Alterações não salvas';
}

function markSaved(message = 'Todas as alterações estão salvas') {
  isUnsaved = false;
  const ind = document.getElementById('saveStatusIndicator');
  const txt = document.getElementById('saveStatusText');
  ind.className = 'save-status';
  txt.textContent = message;
}

// Histórico de Undo / Redo
function pushHistory() {
  undoStack.push(JSON.stringify(currentConfig));
  redoStack = []; // limpa redo ao fazer nova alteração
  updateHistoryButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(currentConfig));
  currentConfig = JSON.parse(undoStack.pop());
  syncInputsWithConfig();
  applyLivePreview();
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(currentConfig));
  currentConfig = JSON.parse(redoStack.pop());
  syncInputsWithConfig();
  applyLivePreview();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  document.getElementById('btnUndo').disabled = undoStack.length === 0;
  document.getElementById('btnRedo').disabled = redoStack.length === 0;
}

// Trocar Abas da Sidebar
function switchSidebarTab(tabName) {
  document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.config-group').forEach(g => g.classList.remove('active'));

  event.target.classList.add('active');
  const activeTab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (activeTab) activeTab.classList.add('active');
}

// Alternar Modo de Visualização (Desktop / Tablet / Mobile)
function setDeviceMode(mode) {
  document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
  const viewport = document.getElementById('previewViewport');
  viewport.className = 'preview-viewport mode-' + mode;

  const btnId = 'btnDev' + mode.charAt(0).toUpperCase() + mode.slice(1);
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');
}

// Alternar Estado do Preview
function changePreviewState(state) {
  previewState = state;
  applyLivePreview();
}

// Aplicar Estilos no Preview em Tempo Real
function applyLivePreview() {
  const c = currentConfig;
  const card = document.getElementById('previewCard');
  const container = document.getElementById('previewContainer');
  const title = document.getElementById('pvTitle');
  const subtitle = document.getElementById('pvSubtitle');
  const mainBtn = document.getElementById('pvMainBtn');
  const iconCircle = document.getElementById('pvIconCircle');
  const statusBadge = document.getElementById('pvStatusBadge');
  const brandMark = document.getElementById('pvBrandMark');

  // Cores & Layout no Card
  container.style.background = c.bgColor;
  card.style.background = c.cardBgColor;
  card.style.borderRadius = c.borderRadius + 'px';
  card.style.maxWidth = c.maxWidth + 'px';
  card.style.padding = c.padding + 'px';

  // Tipografia
  card.style.fontFamily = c.fontFamily;
  title.style.fontSize = c.titleSize + 'px';
  title.style.color = c.textColor;
  subtitle.style.fontSize = c.bodySize + 'px';
  subtitle.style.color = c.textSubColor;

  // Botão
  mainBtn.style.background = c.btnBgColor;
  mainBtn.style.color = c.btnTextColor;
  mainBtn.style.borderRadius = Math.max(8, c.borderRadius - 12) + 'px';
  brandMark.style.background = c.primaryColor;
  if (document.getElementById('pvCardBadge')) document.getElementById('pvCardBadge').style.color = c.primaryColor;
  if (document.getElementById('pvBalanceAmount')) document.getElementById('pvBalanceAmount').style.color = c.primaryColor;
  if (document.getElementById('pvBtnCopy')) document.getElementById('pvBtnCopy').style.background = c.primaryColor;

  // Toggles de Visibilidade
  document.getElementById('pvLogoWrap').style.display = c.showLogo ? 'flex' : 'none';
  document.getElementById('pvTimeline').style.display = c.showTimeline ? 'block' : 'none';
  document.getElementById('pvRowProto').style.display = c.showOrderProto ? 'flex' : 'none';
  document.getElementById('pvRowProduct').style.display = c.showProductInfo ? 'flex' : 'none';
  document.getElementById('pvRowDate').style.display = c.showDeliveredDate ? 'flex' : 'none';

  // Lógica dos Estados (Aguardando vs Aprovado vs Concluído)
  const step3 = document.getElementById('pvStep3Dot');
  const step4 = document.getElementById('pvStep4Dot');
  const deliveryCard = document.getElementById('pvDeliveryCard');

  if (previewState === 'delivered') {
    // ESTADO: ENTREGA CONCLUÍDA
    title.textContent = c.titleDelivered;
    subtitle.textContent = c.subDelivered;
    iconCircle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    iconCircle.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    statusBadge.textContent = '✅ Entregue';
    statusBadge.style.color = '#059669';
    statusBadge.style.background = '#ecfdf5';

    step3.style.background = '#10b981';
    step3.textContent = '✓';
    step4.style.background = '#10b981';
    step4.textContent = '✓';

    deliveryCard.style.display = c.showDeliveryCard ? 'block' : 'none';
    mainBtn.textContent = 'Baixar Extensão LovableUnlimited';
  } else if (previewState === 'awaiting') {
    // ESTADO: AGUARDANDO ENTREGA
    title.textContent = c.titleAwaiting;
    subtitle.textContent = c.subAwaiting;
    iconCircle.style.background = `linear-gradient(135deg, ${c.primaryColor}, #5b21b6)`;
    iconCircle.innerHTML = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    statusBadge.textContent = '● Preparando Entrega';
    statusBadge.style.color = c.primaryColor;
    statusBadge.style.background = '#f5f3ff';

    step3.style.background = c.primaryColor;
    step3.textContent = '●';
    step4.style.background = '#ffffff';
    step4.style.border = '2px solid #d4c5eb';
    step4.style.color = '#8e7ea6';
    step4.textContent = '4';

    deliveryCard.style.display = 'none';
    mainBtn.textContent = 'Verificar se a entrega está pronta';
  } else {
    // ESTADO: PAGAMENTO APROVADO
    title.textContent = c.titleAwaiting;
    subtitle.textContent = 'Pagamento identificado via PIX. Liberando fila de atendimento.';
    iconCircle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    iconCircle.innerHTML = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    statusBadge.textContent = '✓ Pagamento Aprovado';
    statusBadge.style.color = '#059669';
    statusBadge.style.background = '#ecfdf5';

    step3.style.background = '#ffffff';
    step3.style.border = '2px solid #d4c5eb';
    step3.style.color = '#8e7ea6';
    step3.textContent = '3';
    step4.style.background = '#ffffff';
    step4.style.border = '2px solid #d4c5eb';
    step4.style.color = '#8e7ea6';
    step4.textContent = '4';

    deliveryCard.style.display = 'none';
    mainBtn.textContent = 'Aguardando Despacho';
  }
}

// Salvar Rascunho
async function saveDraft() {
  if (!supabaseClient) {
    alert('Supabase desconectado.');
    return;
  }
  try {
    let idToUpdate = loadedSettingsId;
    if (!idToUpdate) {
      const { data } = await supabaseClient.from('settings').select('id').single();
      if (data) idToUpdate = data.id;
    }
    if (idToUpdate) {
      const { error } = await supabaseClient
        .from('settings')
        .update({ delivery_page_draft: currentConfig })
        .eq('id', idToUpdate);
      if (error) throw error;
    }
    markSaved('Rascunho salvo com sucesso!');
  } catch(e) {
    alert('Erro ao salvar rascunho: ' + e.message);
  }
}

// Modal de Publicação
function openPublishModal() {
  document.getElementById('modalPublishConfirm').style.display = 'flex';
}

function closePublishModal() {
  document.getElementById('modalPublishConfirm').style.display = 'none';
}

// Publicar Alterações
async function publishConfig() {
  if (!supabaseClient) {
    alert('Supabase desconectado.');
    return;
  }
  try {
    let idToUpdate = loadedSettingsId;
    if (!idToUpdate) {
      const { data } = await supabaseClient.from('settings').select('id').single();
      if (data) idToUpdate = data.id;
    }
    if (idToUpdate) {
      const { error } = await supabaseClient
        .from('settings')
        .update({
          delivery_page_config: currentConfig,
          delivery_page_draft: currentConfig
        })
        .eq('id', idToUpdate);
      if (error) throw error;
    }

    closePublishModal();
    markSaved('Alterações publicadas com sucesso!');

    // Disparar confete no editor para celebrar publicação
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  } catch(e) {
    alert('Erro ao publicar: ' + e.message);
  }
}
