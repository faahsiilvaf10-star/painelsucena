@echo off
chcp 65001 >nul
set "APP_EXE=%~dp0PainelSucena.exe"
set "SHORTCUT=%USERPROFILE%\Desktop\Painel Sucena.lnk"

if exist "%SHORTCUT%" (
    echo Atalho ja existe na area de trabalho.
    pause
    exit /b
)

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%SHORTCUT%'); $sc.TargetPath = '%APP_EXE%'; $sc.WorkingDirectory = '%~dp0'; $sc.IconLocation = '%APP_EXE%,0'; $sc.Description = 'Painel Sucena - Controle Operacional'; $sc.Save()"

if exist "%SHORTCUT%" (
    echo Atalho criado com sucesso na area de trabalho!
) else (
    echo Falha ao criar atalho. Tente executar como administrador.
)
pause
