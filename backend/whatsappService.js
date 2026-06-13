const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

let client = null;
let connectionStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, QR_READY, CONNECTED
let qrCodeDataUrl = '';
let connectedUser = null;

/**
 * Normalise phone number to WhatsApp Chat ID format (e.g., 919876543210@c.us)
 */
function formatChatId(mobile) {
  if (!mobile) return null;
  // Keep only digits
  let cleaned = mobile.toString().replace(/\D/g, '');
  
  // If it's 10 digits, default to Indian country code +91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return `${cleaned}@c.us`;
}

/**
 * Find local Chrome or Edge executable on Windows
 */
function getBrowserExecutablePath() {
  if (process.platform !== 'win32') return null;
  
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`🔍 Detected local browser at: ${p}`);
      return p;
    }
  }
  return null;
}

/**
 * Initialize WhatsApp Web Client
 */
function initializeClient() {
  console.log('🔄 Initializing WhatsApp client...');
  connectionStatus = 'CONNECTING';
  qrCodeDataUrl = '';
  connectedUser = null;

  const execPath = getBrowserExecutablePath();
  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
  };

  if (execPath) {
    puppeteerConfig.executablePath = execPath;
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: puppeteerConfig
  });

  client.on('qr', async (qr) => {
    console.log('📷 WhatsApp QR Code received. Generate base64 visual...');
    try {
      qrCodeDataUrl = await qrcode.toDataURL(qr);
      connectionStatus = 'QR_READY';
    } catch (err) {
      console.error('❌ Failed to generate QR data URL:', err);
    }
  });

  client.on('ready', () => {
    console.log('🟢 WhatsApp Client is Ready and Connected!');
    connectionStatus = 'CONNECTED';
    qrCodeDataUrl = '';
    
    if (client.info && client.info.wid) {
      connectedUser = {
        name: client.info.pushname || 'POS Server',
        number: client.info.wid.user
      };
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp Authentication failure:', msg);
    connectionStatus = 'DISCONNECTED';
    qrCodeDataUrl = '';
    connectedUser = null;
  });

  client.on('disconnected', (reason) => {
    console.log('🔴 WhatsApp Client disconnected:', reason);
    connectionStatus = 'DISCONNECTED';
    qrCodeDataUrl = '';
    connectedUser = null;
  });

  client.initialize().catch(err => {
    console.error('❌ Failed to initialize WhatsApp client:', err);
    connectionStatus = 'DISCONNECTED';
  });
}

/**
 * Get current link status
 */
function getStatus() {
  return {
    status: connectionStatus,
    qrCode: qrCodeDataUrl,
    user: connectedUser
  };
}

/**
 * Disconnect and destroy the current session
 */
async function disconnect() {
  if (client) {
    try {
      console.log('🔄 Destroying WhatsApp client...');
      await client.destroy();
    } catch (err) {
      console.error('Error destroying client:', err);
    }
  }

  connectionStatus = 'DISCONNECTED';
  qrCodeDataUrl = '';
  connectedUser = null;
  client = null;

  // Clear local authentication directory
  const authDir = path.join(__dirname, '.wwebjs_auth');
  if (fs.existsSync(authDir)) {
    try {
      console.log('🗑️ Clearing local WhatsApp authentication folder...');
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to delete session directory:', err);
    }
  }

  // Reinitialize client
  initializeClient();
}

/**
 * Send Text Message
 */
async function sendTextMessage(mobile, message) {
  if (connectionStatus !== 'CONNECTED' || !client) {
    throw new Error('WhatsApp is not linked. Scan the QR code from the dashboard first.');
  }

  const chatId = formatChatId(mobile);
  if (!chatId) throw new Error('Invalid mobile number provided.');

  try {
    await client.sendMessage(chatId, message);
    console.log(`✉️ Text message sent to ${chatId}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send text to ${chatId}:`, err);
    throw err;
  }
}

/**
 * Send PDF Receipt Buffer
 */
async function sendPdfReceipt(mobile, pdfBuffer, fileName, caption) {
  if (connectionStatus !== 'CONNECTED' || !client) {
    throw new Error('WhatsApp is not linked. Scan the QR code from the dashboard first.');
  }

  const chatId = formatChatId(mobile);
  if (!chatId) throw new Error('Invalid mobile number provided.');

  try {
    const base64Data = pdfBuffer.toString('base64');
    const media = new MessageMedia('application/pdf', base64Data, fileName || 'receipt.pdf');
    
    await client.sendMessage(chatId, media, { caption: caption || 'Here is your receipt.' });
    console.log(`📄 PDF receipt sent to ${chatId}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send PDF to ${chatId}:`, err);
    throw err;
  }
}

/**
 * Safe connection start/reconnect
 */
async function connect() {
  if (client) {
    if (connectionStatus === 'CONNECTED' || connectionStatus === 'CONNECTING' || connectionStatus === 'QR_READY') {
      console.log('ℹ️ WhatsApp client is already active or connecting. Current status:', connectionStatus);
      return;
    }
    try {
      console.log('🔄 Cleaning up previous disconnected client...');
      await client.destroy();
    } catch (err) {
      console.error('Failed to destroy client:', err);
    }
    client = null;
  }
  initializeClient();
}

module.exports = {
  initializeClient,
  getStatus,
  connect,
  disconnect,
  sendTextMessage,
  sendPdfReceipt
};
