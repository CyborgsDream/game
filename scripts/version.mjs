export const VERSION_NUMBER = '0.23';
export const VERSION_TAG = `v${VERSION_NUMBER}`;

function stripExistingVersion(title) {
  if (!title) return '';
  return title.replace(/\s+v\d+(?:\.\d+)*(?:[-+][\w.]+)?$/i, '').trim();
}

export function formatTitle(baseTitle) {
  if (!baseTitle) {
    return VERSION_TAG;
  }
  const stripped = stripExistingVersion(baseTitle);
  return `${stripped} ${VERSION_TAG}`.trim();
}

export function updateVersionLabels(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('[data-version]').forEach((element) => {
    const prefix = element.getAttribute('data-version-prefix') ?? '';
    const suffix = element.getAttribute('data-version-suffix') ?? '';
    element.textContent = `${prefix}${VERSION_TAG}${suffix}`;
  });
}

export function applyVersionMetadata({ titleBase, documentRef = document } = {}) {
  const doc = documentRef ?? document;
  if (!doc) return VERSION_TAG;
  const base = titleBase ?? stripExistingVersion(doc.title);
  if (base) {
    doc.title = formatTitle(base);
  } else if (doc.title) {
    doc.title = `${doc.title.trim()} ${VERSION_TAG}`;
  } else {
    doc.title = VERSION_TAG;
  }
  const htmlEl = doc.documentElement;
  if (htmlEl && typeof htmlEl.setAttribute === 'function') {
    htmlEl.setAttribute('data-version', VERSION_TAG);
  }
  updateVersionLabels(doc);
  return VERSION_TAG;
}
