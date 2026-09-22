(() => {
const content={startup:['orbit','Grandes ideias.<br>Novas órbitas.','Um espaço para conectar o que você imagina ao que vem a seguir.'],portfolio:['forma','Ideias que<br>ganham forma.','Design, direção criativa e projetos com um olhar próprio.'],dashboard:['pulse','Cada projeto.<br>Um novo avanço.','Organize suas entregas e acompanhe o que está tomando forma.']};
let busy=false;
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',async()=>{
 if(busy)return;busy=true;
 const buttons=[...document.querySelectorAll('[data-project]')];buttons.forEach(b=>{b.disabled=true;b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
 const preview=document.getElementById('projectPreview'),status=document.getElementById('buildProgress');
 document.querySelector('.demo-section .chat-request').textContent='Crie '+button.textContent.replace('↗','').trim().toLowerCase();
 preview.classList.add('is-building');
 for(const step of ['Analisando solicitação…','Criando estrutura…','Aplicando estilos…']){status.textContent=step;await new Promise(r=>setTimeout(r,850));}
 const [name,title,description]=content[button.dataset.project];preview.className='project-preview '+button.dataset.project;
 preview.querySelector('.project-nav b').textContent=name;preview.querySelector('.project-content h3').innerHTML=title;preview.querySelector('.project-content p').textContent=description;
 status.innerHTML='<span class="progress-check">✓</span> Projeto atualizado';buttons.forEach(b=>b.disabled=false);busy=false;
}));
document.querySelectorAll('[data-project]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0)));
})();
