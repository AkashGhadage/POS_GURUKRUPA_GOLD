Set WshShell = CreateObject("WScript.Shell")
' The "0" at the end tells Windows to run the window hidden
WshShell.Run "cmd /c ""C:\Users\HP\POS_GURUKRUPA_GOLD\stop.bat""", 0, False

' This line only runs AFTER the batch file above is finished
MsgBox "All services have been stopped.", 64, "App Controller"