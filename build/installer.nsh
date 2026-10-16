; Worldcraft Browser - Windows-Standardbrowser-Registrierung (HKCU, keine Admin-Rechte noetig)
; Wird ueber package.json -> build.nsis.include in den electron-builder NSIS-Installer eingebunden.

!macro customInit
  MessageBox MB_ICONSTOP|MB_OK "Das Projekt Worldcraft Browser wurde eingestellt.$\r$\n$\r$\nDer Browser wird nicht mehr weitergefuehrt oder unterstuetzt."
  Quit
!macroEnd

!macro customInstall
  ; --- 1. Anwendung unter StartMenuInternet ---
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser" "" "Worldcraft Browser"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'

  ; --- 2. Capabilities ---
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities" "ApplicationName" "Worldcraft Browser"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities" "ApplicationDescription" "Worldcraft Browser by Worldcraft Systems"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities" "ApplicationIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"

  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities\URLAssociations" "http" "WorldcraftBrowserURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities\URLAssociations" "https" "WorldcraftBrowserURL"

  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities\FileAssociations" ".htm" "WorldcraftBrowserHTML"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities\FileAssociations" ".html" "WorldcraftBrowserHTML"

  WriteRegStr HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities\StartMenu" "StartMenuInternet" "WorldcraftBrowser"

  ; --- 3. RegisteredApplications (zeigt auf den Capabilities-Pfad) ---
  WriteRegStr HKCU "Software\RegisteredApplications" "WorldcraftBrowser" "Software\Clients\StartMenuInternet\WorldcraftBrowser\Capabilities"

  ; --- 4. ProgIDs ---
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserURL" "" "Worldcraft Browser URL"
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserURL" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserURL\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserURL\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserHTML" "" "Worldcraft Browser HTML Document"
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserHTML\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\WorldcraftBrowserHTML\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Windows ueber geaenderte Dateizuordnungen informieren
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroEnd

!macro customUnInstall
  DeleteRegKey HKCU "Software\Clients\StartMenuInternet\WorldcraftBrowser"
  DeleteRegValue HKCU "Software\RegisteredApplications" "WorldcraftBrowser"
  DeleteRegKey HKCU "Software\Classes\WorldcraftBrowserURL"
  DeleteRegKey HKCU "Software\Classes\WorldcraftBrowserHTML"

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroEnd
