@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Publicando no GitHub Pages...
git add -A
git commit -m "redesign dark azul neon, animacoes, pagina de entrega e correcoes"
git push
echo.
if %errorlevel%==0 (echo Pronto! O GitHub Pages atualiza em 1-2 minutos.) else (echo Algo deu errado. Copie a mensagem acima e mande para o Claude.)
pause
