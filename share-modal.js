// Lightweight share modal bootstrapper with null-safe guards
// Prevents errors when the modal markup isn't present on the page.
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('[data-share-modal]');
  const openers = document.querySelectorAll('[data-share-open]');

  if (!modal || openers.length === 0) return;

  const backdrop = modal.querySelector('[data-share-backdrop]');
  const closeButtons = modal.querySelectorAll('[data-share-close]');
  const closeModal = () => modal.classList.remove('is-open');

  openers.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      modal.classList.add('is-open');
    });
  });

  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeModal();
    });
  }
});
