# AI installation
Follow [docs/SKILL.md](docs/SKILL.md): install Python 3 and Node.js, run `npm install`, then `python3 scripts/catctl.py install-launcher`.
Open the desktop launcher; use its actual port from `.local/launcher.port`.
NEVER write example cats into the real roster. Use `--demo` or a temporary `--data-dir`, on port 8771 (or another free port), and set `CAT_OFFICE_URL` accordingly.
Do not stop an existing service to free a port.
