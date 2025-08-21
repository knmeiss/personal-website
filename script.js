// Desktop OS Functionality with Fun Features

// Mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (window.innerWidth <= 768);
}

// Global variables
let activeWindow = null;
let windowZIndex = 100;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let snakeGame = null;
let paintApp = null;
let openWindows = new Set(); // Track open windows
let isDraggingIcon = false;
let draggedIcon = null;
let iconDragOffset = { x: 0, y: 0 };
let iconDragStarted = false;
let desktopClickCount = 0;
let desktopClickTimer = null;
// Sound effects
const sounds = {
    startup: null,
    click: null,
    error: null,
    windowOpen: null,
    windowClose: null
};

// Initialize desktop
document.addEventListener('DOMContentLoaded', function() {
    initializeDesktop();
    initializeSounds();
    initializeWallpaperChanger();
    initializeStartMenu();
    initializeMatrixEffect();
    // Touch support is now handled in initializeDesktop()
    initializeTooltips();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Play startup sound
    playSound('startup');
});

function initializeDesktop() {
    // Position icons in initial grid layout
    positionIconsInitially();
    
    // Add click handlers to desktop icons
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    desktopIcons.forEach(icon => {
        
        if (isMobileDevice()) {
            // Mobile: Single tap to open, no dragging
            icon.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectIcon(this);
                playSound('click');
            });
            
            icon.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const windowId = this.dataset.window + '-window';
                openWindow(windowId);
                playSound('click');
            });
            
            // Disable context menu on mobile
            icon.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
            
        } else {
            // Desktop: Original behavior with dragging
            // Single click to select/highlight
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!isDraggingIcon && !iconDragStarted) {
                    selectIcon(this);
                    playSound('click');
                }
            });
            
            // Double click to open
            icon.addEventListener('dblclick', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!isDraggingIcon && !iconDragStarted) {
                    const windowId = this.dataset.window + '-window';
                    openWindow(windowId);
                    playSound('click');
                }
            });
            
            // Mouse down to start dragging
            icon.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // Left mouse button only
                    iconDragStarted = false;
                    startIconDrag(e, this);
                }
            });
        }
    });

    // Add drag functionality to windows (only on desktop)
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        if (!isMobileDevice()) {
            makeWindowDraggable(window);
        }
        positionWindowRandomly(window);
    });
    
    // Click on desktop to deselect icons and detect triple-click
    document.querySelector('.desktop').addEventListener('click', function(e) {
        // Only trigger on empty desktop area (not on icons, windows, or taskbar)
        if (e.target === this && !isDraggingIcon) {
            deselectAllIcons();
            
            // Triple-click detection for matrix effect
            desktopClickCount++;
            
            if (desktopClickTimer) {
                clearTimeout(desktopClickTimer);
            }
            
            if (desktopClickCount === 3) {
                triggerMatrixEffect();
                desktopClickCount = 0;
            } else {
                desktopClickTimer = setTimeout(() => {
                    desktopClickCount = 0;
                }, 800); // Increased timeout for easier triple-clicking
            }
        }
    });
    
    // Also add triple-click detection to desktop-icons container
    document.querySelector('.desktop-icons').addEventListener('click', function(e) {
        // Only if clicking on empty space within desktop-icons (not on actual icons)
        if (e.target === this && !isDraggingIcon) {
            deselectAllIcons();
            
            // Triple-click detection for matrix effect
            desktopClickCount++;
            
            if (desktopClickTimer) {
                clearTimeout(desktopClickTimer);
            }
            
            if (desktopClickCount === 3) {
                triggerMatrixEffect();
                desktopClickCount = 0;
            } else {
                desktopClickTimer = setTimeout(() => {
                    desktopClickCount = 0;
                }, 800);
            }
        }
    });
    
    // Global mouse events for icon dragging (desktop only)
    if (!isMobileDevice()) {
        document.addEventListener('mousemove', dragIcon);
        document.addEventListener('mouseup', stopIconDrag);
    }
}

function positionIconsInitially() {
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
        const icons = document.querySelectorAll('.desktop-icon');
        console.log('Positioning', icons.length, 'icons'); // Debug log
        
        const iconsPerRow = 3;
        const horizontalSpacing = 160;
        const verticalSpacing = 160;
        const startX = 0;
        const startY = 0;
        
        icons.forEach((icon, index) => {
            const row = Math.floor(index / iconsPerRow);
            const col = index % iconsPerRow;
            
            const x = startX + (col * horizontalSpacing);
            const y = startY + (row * verticalSpacing);
            
            console.log(`Icon ${index}: positioning at ${x}, ${y}`); // Debug log
            
            icon.style.position = 'absolute';
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            icon.style.zIndex = '10';
        });
    }, 100);
}

function startIconDrag(e, icon) {
    e.preventDefault();
    
    // Don't start drag if clicking on solitaire game
    if (e.target.closest('.solitaire-game')) {
        return;
    }
    
    const rect = icon.getBoundingClientRect();
    const desktopRect = document.querySelector('.desktop-icons').getBoundingClientRect();
    
    iconDragOffset.x = e.clientX - rect.left;
    iconDragOffset.y = e.clientY - rect.top;
    
    let hasMoved = false;
    
    // Check if mouse moved significantly to start drag
    const mouseMoveHandler = (moveEvent) => {
        const distance = Math.sqrt(
            Math.pow(moveEvent.clientX - e.clientX, 2) + 
            Math.pow(moveEvent.clientY - e.clientY, 2)
        );
        
        if (distance > 5 && !hasMoved) { // Start drag if moved more than 5px
            hasMoved = true;
            isDraggingIcon = true;
            iconDragStarted = true;
            draggedIcon = icon;
            
            icon.classList.add('dragging');
            selectIcon(icon);
            
            // Bring icon to front
            icon.style.zIndex = '1000';
        }
    };
    
    // Clean up on mouse up
    const mouseUpHandler = () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        
        // If we didn't move, it was just a click
        if (!hasMoved) {
            iconDragStarted = false;
        }
        
        // Reset drag started flag after a short delay
        setTimeout(() => {
            iconDragStarted = false;
        }, 100);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
}

function dragIcon(e) {
    if (!isDraggingIcon || !draggedIcon) return;
    
    // Don't interfere with solitaire game
    if (e.target.closest('.solitaire-game')) return;
    
    const desktopIcons = document.querySelector('.desktop-icons');
    const desktopRect = desktopIcons.getBoundingClientRect();
    
    let newX = e.clientX - desktopRect.left - iconDragOffset.x;
    let newY = e.clientY - desktopRect.top - iconDragOffset.y;
    
    // Keep icon within desktop bounds
    const iconWidth = 80;
    const iconHeight = 80;
    
    newX = Math.max(0, Math.min(newX, desktopRect.width - iconWidth));
    newY = Math.max(0, Math.min(newY, desktopRect.height - iconHeight));
    
    draggedIcon.style.left = newX + 'px';
    draggedIcon.style.top = newY + 'px';
}

function stopIconDrag() {
    if (isDraggingIcon && draggedIcon) {
        draggedIcon.classList.remove('dragging');
        draggedIcon.style.zIndex = '';
        
        // Snap to grid (optional)
        snapIconToGrid(draggedIcon);
        
        isDraggingIcon = false;
        draggedIcon = null;
        
        playSound('click');
    }
}

function snapIconToGrid(icon) {
    const gridSize = 20; // Snap to 20px grid
    const currentX = parseInt(icon.style.left);
    const currentY = parseInt(icon.style.top);
    
    const snappedX = Math.round(currentX / gridSize) * gridSize;
    const snappedY = Math.round(currentY / gridSize) * gridSize;
    
    icon.style.left = snappedX + 'px';
    icon.style.top = snappedY + 'px';
}

function selectIcon(icon) {
    // Deselect all other icons
    deselectAllIcons();
    
    // Select this icon
    icon.classList.add('selected');
}

function deselectAllIcons() {
    const allIcons = document.querySelectorAll('.desktop-icon');
    allIcons.forEach(icon => {
        icon.classList.remove('selected');
    });
}

function initializeSounds() {
    // Create simple beep sounds using Web Audio API
    sounds.startup = createBeepSound(800, 0.1, 'sine');
    sounds.click = createBeepSound(1000, 0.05, 'square');
    sounds.error = createBeepSound(300, 0.2, 'sawtooth');
    sounds.windowOpen = createBeepSound(600, 0.1, 'sine');
    sounds.windowClose = createBeepSound(400, 0.1, 'sine');
}

function createBeepSound(frequency, duration, type = 'sine') {
    return function() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('Audio not supported');
        }
    };
}

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName]();
    }
}

function initializeWallpaperChanger() {
    const wallpaperOptions = document.querySelectorAll('.wallpaper-option');
    const desktop = document.querySelector('.desktop');
    
    wallpaperOptions.forEach(option => {
        option.addEventListener('click', function() {
            const wallpaper = this.dataset.wallpaper;
            console.log('Wallpaper clicked:', wallpaper); // Debug log
            playSound('click');
            
            // Remove existing wallpaper classes and clear all inline styles
            console.log('Before clearing - classes:', desktop.className);
            console.log('Before clearing - inline styles:', desktop.style.cssText);
            
            desktop.className = 'desktop';
            desktop.style.background = '';
            desktop.style.backgroundImage = '';
            desktop.style.backgroundColor = '';
            
            console.log('After clearing - classes:', desktop.className);
            console.log('After clearing - inline styles:', desktop.style.cssText);
            
            // Apply wallpaper
            if (wallpaper === 'default') {
                desktop.style.backgroundImage = 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)';
                desktop.style.backgroundColor = '#1976d2';
            } else if (wallpaper === 'green') {
                desktop.style.backgroundImage = 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)';
                desktop.style.backgroundColor = '#11998e';
            } else {
                desktop.classList.add(`wallpaper-${wallpaper}`);
            }
            
            console.log('Final classes:', desktop.className);
            console.log('Final inline styles:', desktop.style.cssText);
            console.log('Desktop computed background:', window.getComputedStyle(desktop).background);
            
            // Visual feedback
            wallpaperOptions.forEach(opt => opt.style.opacity = '0.7');
            this.style.opacity = '1';
            
            setTimeout(() => {
                wallpaperOptions.forEach(opt => opt.style.opacity = '1');
            }, 1000);
        });
    });
}

// Paint App Implementation
class PaintApp {
    constructor() {
        this.canvas = document.getElementById('paint-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.startX = 0;
        this.startY = 0;
        this.imageData = null;
        
        this.initializeCanvas();
        this.initializeTools();
        this.initializeEvents();
    }
    
    initializeCanvas() {
        // Resize canvas for mobile
        this.resizeCanvas();
        
        // Set canvas background to white
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set default drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentSize;
    }
    
    resizeCanvas() {
        if (window.innerWidth <= 768) {
            // Mobile: fit screen
            this.canvas.width = Math.min(350, window.innerWidth - 20);
            this.canvas.height = Math.min(300, window.innerHeight - 180);
        } else {
            // Desktop: original size
            this.canvas.width = 600;
            this.canvas.height = 400;
        }
    }
    
    initializeTools() {
        // Tool buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
                playSound('click');
            });
        });
        
        // Color swatches
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                colorSwatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.currentColor = swatch.dataset.color;
                this.ctx.strokeStyle = this.currentColor;
                playSound('click');
            });
        });
        
        // Brush size slider
        const brushSize = document.getElementById('brush-size');
        const sizeDisplay = document.getElementById('size-display');
        brushSize.addEventListener('input', () => {
            this.currentSize = brushSize.value;
            this.ctx.lineWidth = this.currentSize;
            sizeDisplay.textContent = this.currentSize;
        });
        
        // Action buttons
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
            playSound('click');
        });
        
        document.getElementById('save-canvas').addEventListener('click', () => {
            this.saveCanvas();
            playSound('click');
        });
    }
    
    initializeEvents() {
        // Window resize handler
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            // Redraw white background after resize
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        
        if (this.currentTool === 'fill') {
            this.floodFill(pos.x, pos.y, this.currentColor);
            return;
        }
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else {
            // For shapes, save the current canvas state
            this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        switch (this.currentTool) {
            case 'brush':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
                break;
                
            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
                break;
                
            case 'line':
                this.drawLine(pos);
                break;
                
            case 'rectangle':
                this.drawRectangle(pos);
                break;
                
            case 'circle':
                this.drawCircle(pos);
                break;
        }
    }
    
    drawLine(pos) {
        // Restore canvas and draw preview line
        this.ctx.putImageData(this.imageData, 0, 0);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    drawRectangle(pos) {
        // Restore canvas and draw preview rectangle
        this.ctx.putImageData(this.imageData, 0, 0);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
    }
    
    drawCircle(pos) {
        // Restore canvas and draw preview circle
        this.ctx.putImageData(this.imageData, 0, 0);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
    }
    
    updateCursor() {
        if (this.currentTool === 'eraser') {
            this.canvas.classList.add('eraser-cursor');
        } else {
            this.canvas.classList.remove('eraser-cursor');
        }
    }
    
    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    floodFill(x, y, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const targetColor = this.getPixelColor(data, x, y, this.canvas.width);
        const fillColorRgb = this.hexToRgb(fillColor);
        
        if (this.colorsMatch(targetColor, fillColorRgb)) return;
        
        const stack = [{x: Math.floor(x), y: Math.floor(y)}];
        
        while (stack.length > 0) {
            const {x: px, y: py} = stack.pop();
            
            if (px < 0 || px >= this.canvas.width || py < 0 || py >= this.canvas.height) continue;
            
            const currentColor = this.getPixelColor(data, px, py, this.canvas.width);
            if (!this.colorsMatch(currentColor, targetColor)) continue;
            
            this.setPixelColor(data, px, py, this.canvas.width, fillColorRgb);
            
            stack.push({x: px + 1, y: py});
            stack.push({x: px - 1, y: py});
            stack.push({x: px, y: py + 1});
            stack.push({x: px, y: py - 1});
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    getPixelColor(data, x, y, width) {
        const index = (y * width + x) * 4;
        return {r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3]};
    }
    
    setPixelColor(data, x, y, width, color) {
        const index = (y * width + x) * 4;
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = 255;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    colorsMatch(color1, color2) {
        return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
    }
    
    saveCanvas() {
        // Create download link
        const link = document.createElement('a');
        link.download = 'my-drawing.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// Solitaire Game Implementation
class SolitaireGame {
    constructor() {
        this.deck = [];
        this.stock = [];
        this.waste = [];
        this.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
        this.tableau = [[], [], [], [], [], [], []];
        this.score = 0;
        this.initializeGame();
    }
    
    initializeGame() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.renderGame();
    }
    
    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        suits.forEach(suit => {
            ranks.forEach(rank => {
                this.deck.push({
                    suit: suit,
                    rank: rank,
                    color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                    value: this.getCardValue(rank),
                    faceUp: false
                });
            });
        });
    }
    
    getCardValue(rank) {
        if (rank === 'A') return 1;
        if (rank === 'J') return 11;
        if (rank === 'Q') return 12;
        if (rank === 'K') return 13;
        return parseInt(rank);
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    dealCards() {
        // Deal to tableau
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = this.deck.pop();
                if (i === j) card.faceUp = true;
                this.tableau[j].push(card);
            }
        }
        
        // Remaining cards go to stock
        this.stock = this.deck;
        this.deck = [];
    }
    
    renderGame() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableau();
        this.updateScore();
    }
    
    renderStock() {
        const stockPile = document.getElementById('stock-pile');
        stockPile.innerHTML = '';
        
        if (this.stock.length > 0) {
            const stockCard = document.createElement('div');
            stockCard.className = 'playing-card face-down';
            stockCard.addEventListener('click', () => this.drawFromStock());
            stockPile.appendChild(stockCard);
        }
    }
    
    renderWaste() {
        const wastePile = document.getElementById('waste-pile');
        wastePile.innerHTML = '';
        
        if (this.waste.length > 0) {
            const topCard = this.waste[this.waste.length - 1];
            const cardElement = this.createCardElement(topCard);
            wastePile.appendChild(cardElement);
        }
    }
    
    renderFoundations() {
        Object.keys(this.foundations).forEach(suit => {
            const foundation = document.querySelector(`[data-suit="${suit}"]`);
            foundation.innerHTML = '';
            
            if (this.foundations[suit].length > 0) {
                const topCard = this.foundations[suit][this.foundations[suit].length - 1];
                const cardElement = this.createCardElement(topCard);
                foundation.appendChild(cardElement);
            }
        });
    }
    
    renderTableau() {
        this.tableau.forEach((pile, index) => {
            const tableauPile = document.querySelector(`[data-pile="${index}"]`);
            tableauPile.innerHTML = '';
            
            pile.forEach((card, cardIndex) => {
                const cardElement = this.createCardElement(card);
                cardElement.style.top = `${cardIndex * 20}px`;
                tableauPile.appendChild(cardElement);
            });
        });
    }
    
    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `playing-card ${card.color}`;
        cardElement.dataset.suit = card.suit;
        cardElement.dataset.rank = card.rank;
        
        if (card.faceUp) {
            cardElement.innerHTML = `
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${this.getSuitSymbol(card.suit)}</div>
            `;
            
            // Add drag functionality for face-up cards
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    suit: card.suit,
                    rank: card.rank,
                    color: card.color
                }));
                cardElement.classList.add('dragging');
            });
            
            cardElement.addEventListener('dragend', () => {
                cardElement.classList.remove('dragging');
            });
            
            // Also add mouse-based dragging for better compatibility
            cardElement.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left mouse button
                    this.startCardDrag(e, cardElement, card);
                }
            });
        } else {
            cardElement.classList.add('face-down');
            // Face-down cards can be clicked to flip
            cardElement.addEventListener('click', () => {
                this.handleCardClick(cardElement, card);
            });
        }
        
        return cardElement;
    }
    
    startCardDrag(e, cardElement, card) {
        e.preventDefault();
        console.log('Starting card drag for:', card.rank, 'of', card.suit); // Debug
        
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = cardElement.getBoundingClientRect();
        
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;
        
        let isDragging = false;
        
        const mouseMoveHandler = (moveEvent) => {
            const distance = Math.sqrt(
                Math.pow(moveEvent.clientX - startX, 2) + 
                Math.pow(moveEvent.clientY - startY, 2)
            );
            
            if (distance > 5 && !isDragging) {
                isDragging = true;
                console.log('Card drag started'); // Debug
                cardElement.classList.add('dragging');
                cardElement.style.zIndex = '1000';
                cardElement.style.position = 'fixed';
            }
            
            if (isDragging) {
                cardElement.style.left = (moveEvent.clientX - offsetX) + 'px';
                cardElement.style.top = (moveEvent.clientY - offsetY) + 'px';
            }
        };
        
        const mouseUpHandler = (upEvent) => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            if (isDragging) {
                cardElement.classList.remove('dragging');
                cardElement.style.zIndex = '';
                cardElement.style.position = '';
                cardElement.style.left = '';
                cardElement.style.top = '';
                
                // Check if dropped on a valid target
                const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                this.handleCardDrop(card, dropTarget);
            } else {
                // It was just a click
                this.handleCardClick(cardElement, card);
            }
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
    
    handleCardClick(cardElement, card) {
        // Handle card clicks (like flipping face-down cards or moving to foundation)
        if (!card.faceUp) {
            card.faceUp = true;
            this.renderGame();
            playSound('click');
        }
    }
    
    handleCardDrop(card, dropTarget) {
        // Handle where the card was dropped
        if (dropTarget && dropTarget.closest) {
            const foundation = dropTarget.closest('[data-suit]');
            const tableauPile = dropTarget.closest('[data-pile]');
            
            if (foundation) {
                // Try to move to foundation
                const suit = foundation.dataset.suit;
                if (this.canMoveToFoundation(card, suit)) {
                    this.moveToFoundation(card, suit);
                    playSound('click');
                }
            } else if (tableauPile) {
                // Try to move to tableau
                const pileIndex = parseInt(tableauPile.dataset.pile);
                if (this.canMoveToTableau(card, pileIndex)) {
                    this.moveToTableau(card, pileIndex);
                    playSound('click');
                }
            }
        }
        
        this.renderGame();
    }
    
    canMoveToFoundation(card, suit) {
        if (card.suit !== suit) return false;
        
        const foundation = this.foundations[suit];
        if (foundation.length === 0) {
            return card.rank === 'A';
        }
        
        const topCard = foundation[foundation.length - 1];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const currentRankIndex = ranks.indexOf(topCard.rank);
        const newRankIndex = ranks.indexOf(card.rank);
        
        return newRankIndex === currentRankIndex + 1;
    }
    
    canMoveToTableau(card, pileIndex) {
        const pile = this.tableau[pileIndex];
        
        if (pile.length === 0) {
            return card.rank === 'K';
        }
        
        const topCard = pile[pile.length - 1];
        if (!topCard.faceUp) return false;
        
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const currentRankIndex = ranks.indexOf(topCard.rank);
        const newRankIndex = ranks.indexOf(card.rank);
        
        return newRankIndex === currentRankIndex - 1 && card.color !== topCard.color;
    }
    
    moveToFoundation(card, suit) {
        // Remove card from current location and add to foundation
        this.removeCardFromCurrentLocation(card);
        this.foundations[suit].push(card);
        this.score += 10;
    }
    
    moveToTableau(card, pileIndex) {
        // Remove card from current location and add to tableau
        this.removeCardFromCurrentLocation(card);
        this.tableau[pileIndex].push(card);
    }
    
    removeCardFromCurrentLocation(card) {
        // Remove from waste
        const wasteIndex = this.waste.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (wasteIndex !== -1) {
            this.waste.splice(wasteIndex, 1);
            return;
        }
        
        // Remove from foundations
        for (let suit in this.foundations) {
            const foundIndex = this.foundations[suit].findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (foundIndex !== -1) {
                this.foundations[suit].splice(foundIndex, 1);
                return;
            }
        }
        
        // Remove from tableau
        for (let i = 0; i < this.tableau.length; i++) {
            const foundIndex = this.tableau[i].findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (foundIndex !== -1) {
                this.tableau[i].splice(foundIndex, 1);
                // Flip the card below if it exists and is face down
                if (this.tableau[i].length > 0) {
                    const belowCard = this.tableau[i][this.tableau[i].length - 1];
                    if (!belowCard.faceUp) {
                        belowCard.faceUp = true;
                    }
                }
                return;
            }
        }
    }
    
    getSuitSymbol(suit) {
        const symbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        return symbols[suit];
    }
    
    drawFromStock() {
        if (this.stock.length > 0) {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
            playSound('click');
        } else if (this.waste.length > 0) {
            // Reset stock from waste
            this.stock = this.waste.reverse();
            this.stock.forEach(card => card.faceUp = false);
            this.waste = [];
            playSound('click');
        }
        this.renderGame();
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    newGame() {
        this.stock = [];
        this.waste = [];
        this.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
        this.tableau = [[], [], [], [], [], [], []];
        this.score = 0;
        this.initializeGame();
        playSound('windowOpen');
    }
}

function openWindow(windowId) {
    // Map data-window values to actual window IDs
    const windowIdMap = {
        'about': 'about-window',
        'speaking': 'speaking-window', 
        'resources': 'resources-window',
        'social': 'social-window',
        'snake': 'snake-window',
        'wallpaper': 'wallpaper-window',
        'paint': 'paint-window'
    };
    
    const actualWindowId = windowIdMap[windowId] || windowId;
    const window = document.getElementById(actualWindowId);
    
    console.log('Looking for window:', actualWindowId, window); // Debug log
    
    if (!window) {
        console.log('Window not found:', actualWindowId);
        return;
    }

    // Mobile: Close all other windows first (check viewport width instead of window.innerWidth)
    if (window.innerWidth <= 768 || screen.width <= 768) {
        const allWindows = document.querySelectorAll('.window');
        allWindows.forEach(w => {
            if (w.id !== actualWindowId && w.style.display === 'block') {
                closeWindow(w.id);
            }
        });
    }

    // If window is already open, just bring it to front and restore if minimized
    if (openWindows.has(actualWindowId)) {
        restoreWindow(actualWindowId);
        return;
    }

    // Add to open windows set
    openWindows.add(actualWindowId);

    // Open the window
    window.style.display = 'block';
    window.classList.add('active');
    window.classList.remove('minimized');
    bringWindowToFront(window);
    
    // Add taskbar button
    addTaskbarButton(actualWindowId);
    
    // Initialize snake game if opening snake window
    if (windowId === 'snake-window' && !snakeGame) {
        snakeGame = new SnakeGame();
        
        // Add game control button handlers
        document.getElementById('snake-start').addEventListener('click', () => {
            snakeGame.startGame();
        });
        
        document.getElementById('snake-pause').addEventListener('click', () => {
            snakeGame.pauseGame();
        });
    }
    
    // Initialize paint app if opening paint window
    if (windowId === 'paint-window' && !paintApp) {
        paintApp = new PaintApp();
    }

    // Add window opening animation
    window.style.transform = 'scale(0.8)';
    window.style.opacity = '0';
    
    setTimeout(() => {
        window.style.transition = 'all 0.3s ease';
        window.style.transform = 'scale(1)';
        window.style.opacity = '1';
        
        setTimeout(() => {
            window.style.transition = '';
        }, 300);
    }, 10);
    
    playSound('windowOpen');
}

function bringWindowToFront(window) {
    window.style.zIndex = ++windowZIndex;
    activeWindow = window;
    
    // Update active state
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach(w => w.classList.remove('active'));
    window.classList.add('active');
    
    // Update taskbar button states
    updateTaskbarButtons();
}

function addTaskbarButton(windowId) {
    const window = document.getElementById(windowId);
    const windowTitle = window.querySelector('.window-title').textContent;
    
    const taskbarButtons = document.getElementById('taskbar-buttons');
    
    // Check if button already exists
    if (document.getElementById(`taskbar-${windowId}`)) {
        return;
    }
    
    const button = document.createElement('div');
    button.className = 'taskbar-button active';
    button.id = `taskbar-${windowId}`;
    button.innerHTML = `
        <div class="window-icon"></div>
        <div class="window-title">${windowTitle}</div>
    `;
    
    button.addEventListener('click', () => {
        toggleWindow(windowId);
        playSound('click');
    });
    
    taskbarButtons.appendChild(button);
    updateTaskbarButtons();
}

function removeTaskbarButton(windowId) {
    const button = document.getElementById(`taskbar-${windowId}`);
    if (button) {
        button.remove();
    }
}

function updateTaskbarButtons() {
    const buttons = document.querySelectorAll('.taskbar-button');
    buttons.forEach(button => {
        const windowId = button.id.replace('taskbar-', '');
        const window = document.getElementById(windowId);
        
        button.classList.remove('active', 'minimized');
        
        if (window && window.classList.contains('minimized')) {
            button.classList.add('minimized');
        } else if (window && window === activeWindow) {
            button.classList.add('active');
        }
    });
}

function toggleWindow(windowId) {
    const window = document.getElementById(windowId);
    if (!window) return;
    
    if (window.classList.contains('minimized')) {
        restoreWindow(windowId);
    } else if (window === activeWindow) {
        minimizeWindow(windowId);
    } else {
        restoreWindow(windowId);
    }
}

function minimizeWindow(windowId) {
    const window = document.getElementById(windowId);
    if (!window) return;
    
    // Add minimize animation
    window.style.transition = 'all 0.3s ease';
    window.style.transform = 'scale(0.1)';
    window.style.opacity = '0';
    
    setTimeout(() => {
        window.style.display = 'none';
        window.classList.add('minimized');
        window.classList.remove('active');
        window.style.transition = '';
        window.style.transform = '';
        window.style.opacity = '';
        
        // Find next active window
        const visibleWindows = Array.from(document.querySelectorAll('.window')).filter(w => 
            w.style.display === 'block' && !w.classList.contains('minimized')
        );
        
        if (visibleWindows.length > 0) {
            bringWindowToFront(visibleWindows[visibleWindows.length - 1]);
        } else {
            activeWindow = null;
        }
        
        updateTaskbarButtons();
    }, 300);
    
    playSound('windowClose');
}

function restoreWindow(windowId) {
    const window = document.getElementById(windowId);
    if (!window) return;
    
    window.style.display = 'block';
    window.classList.remove('minimized');
    bringWindowToFront(window);
    
    // Add restore animation
    window.style.transform = 'scale(0.8)';
    window.style.opacity = '0';
    
    setTimeout(() => {
        window.style.transition = 'all 0.3s ease';
        window.style.transform = 'scale(1)';
        window.style.opacity = '1';
        
        setTimeout(() => {
            window.style.transition = '';
        }, 300);
    }, 10);
    
    playSound('windowOpen');
}

function closeWindow(windowId) {
    const window = document.getElementById(windowId);
    if (!window) return;

    // Remove from open windows set
    openWindows.delete(windowId);
    
    // Remove taskbar button
    removeTaskbarButton(windowId);

    // Add closing animation
    window.style.transition = 'all 0.2s ease';
    window.style.transform = 'scale(0.8)';
    window.style.opacity = '0';

    setTimeout(() => {
        window.style.display = 'none';
        window.classList.remove('active', 'minimized');
        window.style.transition = '';
        window.style.transform = '';
        window.style.opacity = '';
        
        if (activeWindow === window) {
            // Find next active window
            const visibleWindows = Array.from(document.querySelectorAll('.window')).filter(w => 
                w.style.display === 'block' && !w.classList.contains('minimized')
            );
            
            if (visibleWindows.length > 0) {
                bringWindowToFront(visibleWindows[visibleWindows.length - 1]);
            } else {
                activeWindow = null;
            }
        }
        
        updateTaskbarButtons();
    }, 200);
    
    playSound('windowClose');
}

function makeWindowDraggable(window) {
    const header = window.querySelector('.window-header');
    
    // Bring window to front when clicked anywhere on the window
    window.addEventListener('mousedown', function() {
        bringWindowToFront(this);
    });
    
    header.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('window-control')) return;
        
        isDragging = true;
        bringWindowToFront(window);
        
        const rect = window.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', stopDragging);
        
        e.preventDefault();
    });
}

function dragWindow(e) {
    if (!isDragging || !activeWindow) return;
    
    const desktop = document.querySelector('.desktop');
    const desktopRect = desktop.getBoundingClientRect();
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    const windowRect = activeWindow.getBoundingClientRect();
    const maxX = desktopRect.width - windowRect.width;
    const maxY = desktopRect.height - windowRect.height;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    activeWindow.style.left = newX + 'px';
    activeWindow.style.top = newY + 'px';
}

function stopDragging() {
    isDragging = false;
    document.removeEventListener('mousemove', dragWindow);
    document.removeEventListener('mouseup', stopDragging);
}

function positionWindowRandomly(window) {
    const desktop = document.querySelector('.desktop');
    const desktopRect = desktop.getBoundingClientRect();
    
    const windowIndex = Array.from(document.querySelectorAll('.window')).indexOf(window);
    const offset = windowIndex * 30;
    
    const x = Math.min(100 + offset, desktopRect.width - 400);
    const y = Math.min(80 + offset, desktopRect.height - 300);
    
    window.style.left = x + 'px';
    window.style.top = y + 'px';
}

// Snake Game Implementation
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('snake-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        this.snake = [
            {x: 10, y: 10}
        ];
        this.food = {};
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.gameRunning = false;
        this.gameLoop = null;
        
        this.initializeGame();
    }
    
    initializeGame() {
        this.resizeCanvas();
        this.updateScore();
        this.generateFood();
        this.draw();
        this.setupKeyboardControls();
        this.setupResizeHandler();
    }
    
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });
    }
    
    resizeCanvas() {
        if (window.innerWidth <= 768) {
            // Mobile: smaller canvas
            const maxWidth = Math.min(300, window.innerWidth - 40);
            const maxHeight = Math.min(300, window.innerHeight - 200);
            this.canvas.width = Math.floor(maxWidth / this.gridSize) * this.gridSize;
            this.canvas.height = Math.floor(maxHeight / this.gridSize) * this.gridSize;
        } else {
            // Desktop: original size
            this.canvas.width = 400;
            this.canvas.height = 400;
        }
        this.tileCount = this.canvas.width / this.gridSize;
    }
    
    setupKeyboardControls() {
        // Remove any existing event listeners to prevent duplicates
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        this.keydownHandler = (e) => {
            if (!this.gameRunning) return;
            
            // Prevent default arrow key behavior and stop propagation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            
            // Change direction based on key pressed
            switch(e.key) {
                case 'ArrowUp':
                    if (this.dy !== 1) { // Prevent going backwards
                        this.dx = 0;
                        this.dy = -1;
                    }
                    break;
                case 'ArrowDown':
                    if (this.dy !== -1) {
                        this.dx = 0;
                        this.dy = 1;
                    }
                    break;
                case 'ArrowLeft':
                    if (this.dx !== 1) {
                        this.dx = -1;
                        this.dy = 0;
                    }
                    break;
                case 'ArrowRight':
                    if (this.dx !== -1) {
                        this.dx = 1;
                        this.dy = 0;
                    }
                    break;
            }
        };
        
        // Add event listener with capture phase to intercept before desktop
        document.addEventListener('keydown', this.keydownHandler, true);
        
        // Also make the canvas focusable and focus it
        this.canvas.tabIndex = 0;
        this.canvas.focus();
        
        // Add focus to canvas when clicked
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        // Disable buttons during countdown
        document.getElementById('snake-start').disabled = true;
        document.getElementById('snake-pause').disabled = true;
        
        // Show countdown
        this.showCountdown(3, () => {
            this.gameRunning = true;
            this.dx = 1; // Start moving right
            this.dy = 0;
            
            // Focus the canvas to capture keyboard input
            this.canvas.focus();
            
            document.getElementById('snake-pause').disabled = false;
            
            this.gameLoop = setInterval(() => {
                this.update();
                this.draw();
            }, 150); // Game speed
            
            playSound('click');
        });
    }
    
    showCountdown(count, callback) {
        if (count <= 0) {
            // Clear countdown and start game
            this.draw(); // Redraw normal game
            callback();
            return;
        }
        
        // Clear canvas and show countdown number
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw countdown number
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 72px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(count.toString(), this.canvas.width / 2, this.canvas.height / 2);
        
        playSound('click');
        
        // Continue countdown after 1 second
        setTimeout(() => {
            this.showCountdown(count - 1, callback);
        }, 1000);
    }
    
    pauseGame() {
        if (!this.gameRunning) return;
        
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        
        document.getElementById('snake-start').disabled = false;
        document.getElementById('snake-pause').disabled = true;
        
        playSound('click');
    }
    
    update() {
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
            return;
        }
        
        // Check self collision
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver();
                return;
            }
        }
        
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.generateFood();
            playSound('click');
        } else {
            this.snake.pop(); // Remove tail if no food eaten
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw snake
        this.ctx.fillStyle = '#00ff00';
        for (let segment of this.snake) {
            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        }
        
        // Draw food
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
    }
    
    generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        
        // Make sure food doesn't spawn on snake
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.generateFood();
                return;
            }
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        
        const finalScore = this.score;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        // Reset game state
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.updateScore();
        this.generateFood();
        this.draw();
        
        document.getElementById('snake-start').disabled = false;
        document.getElementById('snake-pause').disabled = true;
        
        // Show game over message
        setTimeout(() => {
            alert(`Game Over! Your score: ${finalScore}\nHigh Score: ${this.highScore}\n\nClick Start Game to play again!`);
        }, 100);
        
        playSound('startup');
    }
    
    updateScore() {
        document.getElementById('snake-score').textContent = this.score;
        document.getElementById('snake-high-score').textContent = this.highScore;
    }
    
    loadHighScore() {
        try {
            return parseInt(localStorage.getItem('snake-high-score')) || 0;
        } catch (e) {
            return 0;
        }
    }
    
    saveHighScore() {
        try {
            localStorage.setItem('snake-high-score', this.highScore.toString());
        } catch (e) {
            console.log('Could not save high score');
        }
    }
    
    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
        }
    }
}

// Start Menu Implementation
function initializeStartMenu() {
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');
    
    startButton.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleStartMenu();
        playSound('click');
    });
    
    // Close start menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            closeStartMenu();
        }
    });
    
    // Start menu item handlers
    const menuItems = document.querySelectorAll('.start-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const action = this.dataset.action;
            handleStartMenuAction(action);
            closeStartMenu();
            playSound('click');
        });
    });
}

function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    if (startMenu.classList.contains('show')) {
        closeStartMenu();
    } else {
        startMenu.classList.add('show');
        startButton.classList.add('active');
    }
}

function closeStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    startMenu.classList.remove('show');
    startButton.classList.remove('active');
}

function handleStartMenuAction(action) {
    switch(action) {
        case 'reset':
            resetDesktop();
            break;
        case 'about':
            showAboutDialog();
            break;
    }
}

function resetDesktop() {
    // Close all windows
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach(window => {
        window.style.display = 'none';
        window.classList.remove('active', 'minimized');
    });
    
    // Clear open windows set
    openWindows.clear();
    
    // Remove all taskbar buttons
    const taskbarButtons = document.getElementById('taskbar-buttons');
    taskbarButtons.innerHTML = '';
    
    // Reset desktop wallpaper
    const desktop = document.querySelector('.desktop');
    desktop.className = 'desktop';
    
    // Deselect all icons first
    deselectAllIcons();
    
    // Reset icon positions with a delay to ensure everything is ready
    setTimeout(() => {
        positionIconsInitially();
    }, 200);
    
    // Reset global variables
    activeWindow = null;
    if (snakeGame) {
        snakeGame.destroy();
    }
    snakeGame = null;
    paintApp = null;
    
    playSound('startup');
}

function showAboutDialog() {
    alert('Desktop OS v1.0\n\nBuilt with HTML, CSS, and JavaScript\nBy Kourtney Meiss\n\nHow to Use:\n• Double-click icons to launch apps\n• Use arrow keys + spacebar for keyboard navigation\n• Drag windows and icons around\n• Minimize windows to taskbar\n\nFeatures:\n• Interactive games and tools\n• Draggable windows and icons\n• Taskbar with minimize/restore\n• Hidden easter eggs (try pressing "J"!)');
}

// Matrix Effect Implementation
function initializeMatrixEffect() {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');
    
    // Store matrix animation reference
    window.matrixAnimation = null;
}

function triggerMatrixEffect() {
    const overlay = document.getElementById('matrix-overlay');
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');
    
    // Show overlay
    overlay.classList.add('active');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // English letters and numbers for matrix effect
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charArray = chars.split('');
    
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    // Initialize drops
    for (let i = 0; i < columns; i++) {
        drops[i] = 1;
    }
    
    function drawMatrix() {
        // Semi-transparent black background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Green text (classic Matrix style)
        ctx.fillStyle = '#00ff00';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = charArray[Math.floor(Math.random() * charArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    // Start animation
    window.matrixAnimation = setInterval(drawMatrix, 50);
    
    // Stop after 5 seconds
    setTimeout(() => {
        clearInterval(window.matrixAnimation);
        overlay.classList.remove('active');
        playSound('startup');
    }, 5000);
}

// Tooltip System
function initializeTooltips() {
    const tooltip = document.getElementById('tooltip');
    
    // Add event listeners to all elements with title attribute
    document.addEventListener('mouseover', function(e) {
        if (e.target.hasAttribute('title')) {
            const title = e.target.getAttribute('title');
            if (title) {
                tooltip.textContent = title;
                tooltip.style.display = 'block';
                // Remove title to prevent browser tooltip
                e.target.setAttribute('data-title', title);
                e.target.removeAttribute('title');
            }
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (tooltip.style.display === 'block') {
            const x = e.clientX + 10; // 10px to the right of cursor
            const y = e.clientY - 30; // 30px above cursor
            
            // Keep tooltip on screen
            const tooltipRect = tooltip.getBoundingClientRect();
            const maxX = window.innerWidth - tooltipRect.width - 10;
            const maxY = window.innerHeight - tooltipRect.height - 10;
            
            tooltip.style.left = Math.min(x, maxX) + 'px';
            tooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        if (e.target.hasAttribute('data-title')) {
            tooltip.style.display = 'none';
            // Restore title attribute
            e.target.setAttribute('title', e.target.getAttribute('data-title'));
            e.target.removeAttribute('data-title');
        }
    });
}

// Manual fix function for debugging - you can call this from browser console
window.fixIcons = function() {
    console.log('Manually fixing icon positions...');
    const icons = document.querySelectorAll('.desktop-icon');
    
    icons.forEach((icon, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        const x = col * 120;
        const y = row * 120;
        
        console.log(`Fixing icon ${index} (${icon.querySelector('.icon-label').textContent}): ${x}, ${y}`);
        
        icon.style.position = 'absolute';
        icon.style.left = x + 'px';
        icon.style.top = y + 'px';
        icon.style.zIndex = '10';
        icon.style.transform = 'none';
    });
};

// Keyboard navigation for desktop icons
let currentFocusIndex = -1;
const desktopIcons = document.querySelectorAll('.desktop-icon');

// DISABLED: Keyboard navigation to prevent multiple window opens
/*
document.addEventListener('keydown', function(e) {
    console.log('Key pressed:', e.code); // Debug all key presses
    
    // Desktop icon navigation
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        console.log('Arrow key pressed, currentFocusIndex:', currentFocusIndex);
        e.preventDefault();
        
        // Remove current focus
        if (currentFocusIndex >= 0) {
            desktopIcons[currentFocusIndex].classList.remove('keyboard-focused');
        }
        
        // Navigate based on arrow key
        if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
            currentFocusIndex = (currentFocusIndex + 1) % desktopIcons.length;
        } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
            currentFocusIndex = currentFocusIndex <= 0 ? desktopIcons.length - 1 : currentFocusIndex - 1;
        }
        
        // Add focus to new icon
        desktopIcons[currentFocusIndex].classList.add('keyboard-focused');
        console.log('New focus index:', currentFocusIndex);
        return; // Exit early to prevent other handlers
    }
    
    // Clear focus with escape
    if (e.code === 'Escape' && currentFocusIndex >= 0) {
        console.log('Escape pressed, clearing focus');
        desktopIcons[currentFocusIndex].classList.remove('keyboard-focused');
        currentFocusIndex = -1;
        return; // Exit early to prevent other handlers
    }
});
*/

// Test functions for debugging
window.testMatrix = function() {
    console.log('Testing matrix effect...');
    triggerMatrixEffect();
};

window.testSnake = function() {
    console.log('Testing snake game...');
    if (snakeGame) {
        console.log('Snake game exists');
        console.log('Game running:', snakeGame.gameRunning);
        console.log('Score:', snakeGame.score);
        console.log('High score:', snakeGame.highScore);
    } else {
        console.log('Snake game not initialized');
    }
};

window.debugInfo = function() {
    console.log('=== DEBUG INFO ===');
    console.log('isDraggingIcon:', isDraggingIcon);
    console.log('draggedIcon:', draggedIcon);
    console.log('iconDragStarted:', iconDragStarted);
    console.log('snakeGame:', snakeGame);
    console.log('paintApp:', paintApp);
    console.log('openWindows:', Array.from(openWindows));
    console.log('desktopClickCount:', desktopClickCount);
};

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const timeElement = document.getElementById('taskbar-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        if (activeWindow) {
            closeWindow(activeWindow.id);
        }
    }
    
    if (e.key === 'Escape') {
        if (activeWindow) {
            closeWindow(activeWindow.id);
        } else {
            // If no active window, deselect icons
            deselectAllIcons();
        }
    }
    
    // Konami code easter egg
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    if (!window.konamiSequence) window.konamiSequence = [];
    
    window.konamiSequence.push(e.code);
    if (window.konamiSequence.length > konamiCode.length) {
        window.konamiSequence.shift();
    }
    
    if (window.konamiSequence.join(',') === konamiCode.join(',')) {
        playSound('startup');
        window.konamiSequence = [];
    }
});

function navigateIcons(direction) {
    const icons = Array.from(document.querySelectorAll('.desktop-icon'));
    const selectedIcon = document.querySelector('.desktop-icon.selected');
    
    if (!selectedIcon) {
        // No icon selected, select the first one
        selectIcon(icons[0]);
        return;
    }
    
    // Find closest icon in the given direction
    const selectedRect = selectedIcon.getBoundingClientRect();
    const selectedCenterX = selectedRect.left + selectedRect.width / 2;
    const selectedCenterY = selectedRect.top + selectedRect.height / 2;
    
    let bestIcon = null;
    let bestDistance = Infinity;
    
    icons.forEach(icon => {
        if (icon === selectedIcon) return;
        
        const iconRect = icon.getBoundingClientRect();
        const iconCenterX = iconRect.left + iconRect.width / 2;
        const iconCenterY = iconRect.top + iconRect.height / 2;
        
        let isValidDirection = false;
        
        switch(direction) {
            case 'ArrowRight':
                isValidDirection = iconCenterX > selectedCenterX;
                break;
            case 'ArrowLeft':
                isValidDirection = iconCenterX < selectedCenterX;
                break;
            case 'ArrowDown':
                isValidDirection = iconCenterY > selectedCenterY;
                break;
            case 'ArrowUp':
                isValidDirection = iconCenterY < selectedCenterY;
                break;
        }
        
        if (isValidDirection) {
            const distance = Math.sqrt(
                Math.pow(iconCenterX - selectedCenterX, 2) + 
                Math.pow(iconCenterY - selectedCenterY, 2)
            );
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIcon = icon;
            }
        }
    });
    
    if (bestIcon) {
        selectIcon(bestIcon);
    }
}

// Window control button functionality
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('window-control')) {
        const window = e.target.closest('.window');
        
        if (e.target.classList.contains('close')) {
            closeWindow(window.id);
        } else if (e.target.classList.contains('minimize')) {
            minimizeWindow(window.id);
        } else if (e.target.classList.contains('maximize')) {
            if (window.classList.contains('maximized')) {
                window.classList.remove('maximized');
                window.style.width = '';
                window.style.height = '';
                window.style.top = '';
                window.style.left = '';
            } else {
                window.classList.add('maximized');
                window.style.width = '90vw';
                window.style.height = '80vh';
                window.style.top = '5vh';
                window.style.left = '5vw';
            }
            playSound('click');
        }
    }
});

// Mobile touch support for icons and windows
let touchStartTime = 0;
let touchCount = 0;
let touchStartPos = { x: 0, y: 0 };

// Touch support is now handled directly in initializeDesktop() for better mobile optimization
