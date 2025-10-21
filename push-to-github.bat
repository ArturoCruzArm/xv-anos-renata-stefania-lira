@echo off
echo ========================================
echo Subiendo proyecto a GitHub...
echo ========================================
echo.

cd /d C:\Users\foro7\xv-anos-renata

echo [1/2] Verificando repositorio remoto...
git remote -v
echo.

echo [2/2] Subiendo codigo a GitHub...
git push -u origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo EXITO! Proyecto subido a GitHub
    echo ========================================
    echo.
    echo Tu sitio estara disponible en:
    echo https://arturocr uzarm.github.io/xv-anos-renata-stefania-lira/
    echo.
    echo Ahora ve a GitHub y activa GitHub Pages:
    echo 1. Ve a: https://github.com/ArturoCruzArm/xv-anos-renata-stefania-lira/settings/pages
    echo 2. En "Source" selecciona: main / (root^)
    echo 3. Click en Save
    echo.
) else (
    echo ========================================
    echo ERROR al subir el proyecto
    echo ========================================
    echo.
    echo Verifica que:
    echo 1. Hayas creado el repositorio en GitHub
    echo 2. Tengas permisos para hacer push
    echo.
)

pause
