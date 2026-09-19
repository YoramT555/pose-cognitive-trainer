# Installation and sharing

## Local preview

On Windows, double-click `START-APP.bat`. Your browser opens automatically. Keep the command window open while using the app.

Or, from the application directory:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080` in a browser. Keep the terminal window open while testing.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload everything in this directory to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. Open the web address shown by GitHub Pages.

## Install on devices

- **Android/Chrome:** Open the published address, open the browser menu, and select **Install app** or **Add to Home screen**.
- **iPhone/Safari:** Open the address, tap **Share**, choose **Add to Home Screen**, enable **Open as Web App**, and tap **Add**.
- **Windows/Edge:** Open the address and click the app-install icon in the address bar.
- **Windows/Chrome:** Open the address and select **Cast, save and share → Install page as app**.

The site must be served through HTTPS for installation and offline caching. GitHub Pages supplies HTTPS automatically.
