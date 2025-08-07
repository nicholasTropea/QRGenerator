# QR Code Generator

A from-scratch QR code generator built without external libraries. Features a clean web interface and demonstrates complete QR code encoding implementation including error correction.

🔗 **[Live Demo](nicholasTropea.github.io/QRGenerator/)**

![GitHub Pages](https://img.shields.io/github/deployments/username/repo/github-pages)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-green)

## ✨ Features

- **Zero Dependencies** - Pure JavaScript implementation
- **Complete QR Spec** - Supports all QR code versions and error correction levels
- **Responsive Design** - Works on desktop and mobile
- **Real-time Generation** - Instant QR code creation as you type
- **Educational** - Well-documented code for learning purposes

## 🚀 Demo

![QR Generator Demo](screenshots/demo.gif)

Try it live: [QR Generator](nicholasTropea.github.io/QRGenerator/)

### Example Usage
- Enter text: `"Hello World"`
- Press the "Generate QR Code!" button.
- Download or copy the generated QR code

## 🔧 Technical Details

### QR Code Implementation
- **Encoding**: Supports Numeric, Alphanumeric, Byte, and Kanji modes
- **Error Correction**: Reed-Solomon error correction (L, M, Q, H levels)
- **Versions**: QR versions 1-40 (21x21 to 177x177 modules)
- **Masking**: All 8 mask patterns implemented

### Frontend
- **Framework**: Vite + React
- **Styling**: SCSS with responsive design
- **Canvas**: HTML5 Canvas for QR code rendering

## 📦 Installation

### Run Locally
```bash
git clone https://github.com/username/qr-generator
cd qr-generator
# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
```

## 📁 Project Structure

```
qr-generator/
├── README.md 
├── index.html                                  # Main HTML file
└── src/
    ├── main.jsx                                # Main JSX file
    ├── App.jsx             
    ├── App.css             
    ├── index.scss          
    ├── utils/                                  # JS files of QR Generator implementation
    │   ├── main.js                             # Main JS file
    │   ├── kanji_mode_characters_table.js
    │   ├── raw_data_encoding_constants.js
    │   └── reed_solomon_constants.js
    ├── pages/                                  # JSX files of pages Home and About
    ├── components/                             # JSX files of components
    ├── styles/                                 # SCSS files for pages and components
    └── assets/                                 # Images
```

## 🤝 Contributing

Contributions are welcome! This project is educational and perfect for:

- Learning QR code algorithms
- Improving the UI/UX
- Adding new features
- Optimizing performance

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ features
- Comment complex algorithms
- Keep functions pure when possible
- Follow existing naming conventions

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details

## 🙏 Acknowledgments

- QR Code specification by Denso Wave
- Reed-Solomon error correction algorithm
- Inspiration from the need to understand QR codes from first principles

---

**Built with ❤️ and curiosity about how QR codes actually work**