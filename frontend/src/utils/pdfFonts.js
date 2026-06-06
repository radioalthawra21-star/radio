import { jsPDF } from 'jspdf';

export const ARABIC_FONT = 'Montserrat-Arabic';

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let fontCache = null;

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function loadArabicFonts() {
  if (fontCache) return fontCache;
  try {
    const resp = await fetch('/fonts/MONTSERRAT-ARABIC-REGULAR.TTF');
    if (!resp.ok) throw new Error('Regular font not found');
    const buffer = await resp.arrayBuffer();
    fontCache = { regular: arrayBufferToBase64(buffer) };
    const resp2 = await fetch('/fonts/MONTSERRAT-ARABIC-LIGHT.TTF');
    if (resp2.ok) {
      const buffer2 = await resp2.arrayBuffer();
      fontCache.light = arrayBufferToBase64(buffer2);
    }
    return fontCache;
  } catch (e) {
    console.warn('Could not load Arabic font for PDF:', e.message);
    return null;
  }
}

function ensureFontOnDoc(doc) {
  if (!fontCache || doc._arabicFontLoaded) return doc._arabicFontLoaded;
  try {
    doc.addFileToVFS('Montserrat-Arabic-Regular.ttf', fontCache.regular);
    doc.addFont('Montserrat-Arabic-Regular.ttf', ARABIC_FONT, 'normal');
    if (fontCache.light) {
      doc.addFileToVFS('Montserrat-Arabic-Light.ttf', fontCache.light);
      doc.addFont('Montserrat-Arabic-Light.ttf', ARABIC_FONT, 'light');
    }
    doc._arabicFontLoaded = true;
    return true;
  } catch (e) {
    return false;
  }
}

loadArabicFonts();

jsPDF.API.setRtl = function (enabled) {
  if (enabled) {
    ensureFontOnDoc(this);
    if (this._arabicFontLoaded) {
      try { this.setFont(ARABIC_FONT, 'normal'); } catch (e) { /* ignore */ }
    }
  } else {
    try { this.setFont('helvetica', 'normal'); } catch (e) { /* ignore */ }
  }
  return this;
};

function hasArabic(text) {
  if (!text) return false;
  if (typeof text === 'string') return ARABIC_RE.test(text);
  if (Array.isArray(text)) return text.some(t => t && ARABIC_RE.test(String(t)));
  return false;
}

var _arabicParser = jsPDF.API.__arabicParser__;
var _shapeArabic = _arabicParser && _arabicParser.processArabic;

if (jsPDF.API.events && _shapeArabic) {
  var processArabicHandler = null;
  var otherPreTextHandlers = [];
  for (var _i = 0; _i < jsPDF.API.events.length; _i++) {
    var entry = jsPDF.API.events[_i];
    if (entry[0] === 'preProcessText' && entry[1] === jsPDF.API.processArabic) {
      processArabicHandler = entry[1];
    } else {
      otherPreTextHandlers.push(entry);
    }
  }
  jsPDF.API.events = otherPreTextHandlers;

  jsPDF.API.processArabic = function (t) {
    if (typeof t === 'string') return t;
    if (t && t.text) { t.text = t.text; return t; }
    return t;
  };

  jsPDF.API.events.push(['preProcessText', function (args) {
    if (!args || !args.text) return;
    if (!hasArabic(args.text)) return;
    if (typeof args.text === 'string') {
      var reversed = args.text.split('').reverse().join('');
      args.text = _shapeArabic(reversed);
    } else if (Array.isArray(args.text)) {
      for (var _j = 0; _j < args.text.length; _j++) {
        var line = args.text[_j];
        if (typeof line === 'string' && ARABIC_RE.test(line)) {
          var _rev = line.split('').reverse().join('');
          args.text[_j] = _shapeArabic(_rev);
        } else if (Array.isArray(line)) {
          var txt = line[0];
          if (typeof txt === 'string' && ARABIC_RE.test(txt)) {
            var _rev2 = txt.split('').reverse().join('');
            line[0] = _shapeArabic(_rev2);
          }
        }
      }
    }
    if (args.options) {
      args.options.isInputRtl = false;
      args.options.isInputVisual = false;
    }
  }]);
}
