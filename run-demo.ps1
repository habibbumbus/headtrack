Start-Process -FilePath "c:\Users\disar\projects\headtrack\backend\.venv\Scripts\python.exe" `
  -ArgumentList "-m uvicorn app:app --host 0.0.0.0 --port 8000" `
  -WorkingDirectory "c:\Users\disar\projects\headtrack\backend"

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c npm run dev -- --host --port 5173" `
  -WorkingDirectory "c:\Users\disar\projects\headtrack\frontend"
