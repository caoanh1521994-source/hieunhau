# Ghép src/ → index.html (cho Vercel) và preview.html (bản xem trước dạng mảnh, không có <html>/<head>)
import os, re, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(ROOT, "src")
rd = lambda *p: open(os.path.join(SRC, *p), encoding="utf-8").read()
THREE = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
mark = "data:image/png;base64," + rd("mark.b64").strip()
logo = "data:image/webp;base64," + rd("logo.b64").strip()
head = rd("head.html").replace("{{CSS}}", rd("style.css")).replace("{{MARK}}", mark)
js = "const LOGO_SRC=" + repr(logo).replace("'", '"') + ";\n" + "\n".join(rd(f) for f in ["data.js", "audio.js", "world.js", "app.js"])
body = rd("app.html") + "\n" + THREE + "\n<script>\n" + js + "\n</script>\n"
assert "{{" not in head + body, "còn placeholder chưa thay"
full = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head + "</head>\n<body>\n" + body + "</body>\n</html>\n")
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(full)
open(os.path.join(ROOT, "preview.html"), "w", encoding="utf-8").write(head + body)
print("index.html:", len(full.encode()), "bytes")
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f: f.write(js)
try:
    r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
    print("JS:", "OK" if r.returncode == 0 else r.stderr); sys.exit(r.returncode)
finally: os.unlink(f.name)
