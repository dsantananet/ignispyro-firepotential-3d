@echo off
cd /d "%~dp0"
echo Abrir http://127.0.0.1:4187 no navegador.
echo Manter esta janela aberta enquanto usa o prototipo.
node serve.cjs
pause
