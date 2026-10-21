@echo off
cd /d "%~dp0"
echo Gym Control - servidor local (PHP + MySQL)
echo Antes de continuar: iniciar MySQL desde el panel de XAMPP e importar database.sql (ver README).
echo Abri http://localhost:8000/index.html en el navegador.
echo Manten esta ventana abierta. Para detener: Ctrl+C.
where php >nul 2>nul
if %errorlevel% equ 0 (
  php -S 127.0.0.1:8000
  goto :fin
)
if exist "C:\xampp\php\php.exe" (
  "C:\xampp\php\php.exe" -S 127.0.0.1:8000
  goto :fin
)
echo No se encontro PHP. Instala XAMPP o copia la carpeta del proyecto en C:\xampp\htdocs
echo y abri http://localhost/gym-control-ae1/index.html con Apache y MySQL iniciados.
:fin
pause
