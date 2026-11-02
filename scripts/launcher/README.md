# Launcher resources

`../launcher.py` generates platform-native launchers with the installation's Python and checkout paths. Run `python3 scripts/catctl.py install-launcher` from the repository root. The shared icon source is `app/assets/cats/orange_wave.png`. Generated machine-specific launchers live only on the desktop.

macOS: app bundle; Windows: batch launcher; Linux: Desktop Entry. Python must remain installed and the checkout must remain at its installed location.
