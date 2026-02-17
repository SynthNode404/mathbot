# MathBot 🧮

An AI-powered math tutor that solves problems step-by-step with beautiful LaTeX formatting. Built with Next.js and powered by local Ollama models.

## ✨ Features

- **Step-by-step solutions** with clear explanations
- **Beautiful math rendering** using LaTeX and KaTeX
- **Image analysis** - upload screenshots of math problems
- **Practice mode** with generated problems and progress tracking
- **Graphing support** with interactive charts
- **Conversation history** with search
- **Dark/Light theme**
- **Keyboard shortcuts** for power users
- **100% free** - runs on your local machine

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama** (the AI engine):
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Install Node.js** (v18 or higher):
   ```bash
   # Check if you have it
   node --version
   ```

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mathbot.git
   cd mathbot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   npm run dev
   ```
   
   Or use the start script (handles everything):
   ```bash
   bash start.sh
   ```

4. Open **http://localhost:3000** in your browser

The first run will download the AI models (qwen2.5:7b and llava), which may take a few minutes.

## 📖 Usage

### Basic Chat
Just type your math problem and press Enter:
```
Solve x² + 5x + 6 = 0
```

### Image Upload
Drag and drop or click the paperclip icon to upload:
- Screenshots of homework
- Photos of whiteboards
- Math textbook pages

### Practice Mode
Click the **practice** tab to:
- Generate problems by difficulty
- Track your progress
- Get instant feedback

### Keyboard Shortcuts
- `Cmd+N` - New conversation
- `Cmd+K` - Focus input
- `Cmd+P` - Toggle practice mode
- `Cmd+F` - Search conversations

## 🎨 Math Formatting

MathBot automatically renders beautiful math:

Inline: `$x^2 + 2x + 1 = 0$`

Display: `$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`

Matrices: `$$A^T = \begin{bmatrix} 1 & 3 & 5 \\ 2 & 4 & 6 \end{bmatrix}$$`

## ⚙️ Configuration

### Environment Variables
Create `.env.local` in the root directory:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_VISION_MODEL=llava
```

### Model Settings
- **qwen2.5:7b** - Excellent at math reasoning (default)
- **llava** - Vision model for analyzing images
- You can use other Ollama models if preferred

## 🛠️ Development

### Project Structure
```
mathbot/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/         # API routes
│   │   └── globals.css  # Global styles
│   └── components/       # React components
│       ├── Chat.tsx     # Main chat interface
│       ├── MathGraph.tsx # Graphing component
│       └── PracticeMode.tsx # Practice mode
├── public/              # Static assets
├── start.sh            # Startup script
└── README.md
```

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run electron # Run as Electron app (development)
npm run electron-build # Build Mac app
bash scripts/build-mac-app.sh # Full Mac app build script
```

## 🌟 What Makes MathBot Special?

- **No API keys needed** - Runs entirely on your machine
- **Privacy-focused** - Your data never leaves your computer
- **Fast responses** - Optimized for speed with local models
- **Beautiful output** - Professional math formatting
- **Free forever** - No subscriptions or limits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🍎 Mac App (No Terminal Required!)

MathBot can be downloaded as a standalone Mac app that anyone can install with a single click!

### For Users (No Coding Required)

1. **Download the DMG** from the [GitHub Releases](https://github.com/yourusername/mathbot/releases) page
2. **Open the DMG file** (double-click it)
3. **Drag MathBot to Applications folder**
4. **Launch from Applications** - no terminal needed!

### For Developers (Building the DMG)

```bash
bash scripts/build-mac-app.sh
```

The DMG will be created at `electron/dist/MathBot-1.0.0.dmg`

### Distribution

1. Upload the DMG to GitHub Releases
2. Share the link - users just download and install!
3. No terminal, no npm, no coding required

**Note**: The app requires Ollama for AI functionality. First-time users will see setup instructions to install Ollama (it's a simple one-click install).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have any questions or issues:

1. Check the [Issues](https://github.com/yourusername/mathbot/issues) page
2. Create a new issue with details
3. Join our Discord (coming soon!)

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] More math topics (statistics, physics)
- [ ] Step-by-step explanations with animations
- [ ] Export to PDF/LaTeX
- [ ] Collaborative study sessions

---

Made with ❤️ for students and math enthusiasts everywhere
# mathbot
