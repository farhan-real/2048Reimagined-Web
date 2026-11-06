(function() {
  class InfoUI {
    constructor(parentUI) {
      this.parent = parentUI;
      this.changelogContainer = document.getElementById('changelog-container');
      this.creditsContainer = document.getElementById('credits-container');
      this.confirmTitle = document.getElementById('confirm-action-title');
      this.confirmDesc = document.getElementById('confirm-action-desc');
      this.btnConfirm = document.getElementById('btn-confirm-action');
      this.btnCancel = document.getElementById('btn-cancel-action');
      this.modalConfirm = document.getElementById('modal-confirm-action');

      this.pendingConfirmCallback = null;
      this.setupConfirmEvents();
    }

    setupConfirmEvents() {
      if (this.btnCancel) {
        this.btnCancel.addEventListener('click', () => {
          this.parent.closeModal(this.modalConfirm);
          this.pendingConfirmCallback = null;
        });
      }
      if (this.btnConfirm) {
        this.btnConfirm.addEventListener('click', () => {
          if (typeof this.pendingConfirmCallback === 'function') {
            this.pendingConfirmCallback();
          }
          this.parent.closeModal(this.modalConfirm);
          this.pendingConfirmCallback = null;
        });
      }
    }

    showConfirmDialog({ title, message, confirmText, onConfirm }) {
      if (this.confirmTitle) this.confirmTitle.textContent = title || "Are you sure?";
      if (this.confirmDesc) this.confirmDesc.textContent = message || "This action cannot be undone.";
      if (this.btnConfirm) this.btnConfirm.textContent = confirmText || "Confirm";
      this.pendingConfirmCallback = onConfirm;
      this.parent.openModal(this.modalConfirm);
    }

    renderChangelog() {
      if (!this.changelogContainer || !window.InfoData) return;
      const logs = window.InfoData.getChangelog();
      this.changelogContainer.innerHTML = "";

      logs.forEach(log => {
        const box = document.createElement('div');
        box.className = "themed-info-box";
        box.style.marginBottom = "10px";

        let html = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="info-version-badge">${log.version}</div>
            <div style="font-size: 0.72rem; font-weight: 700; opacity: 0.7;">${log.title}</div>
          </div>
          <ul class="dialog-list">
        `;
        log.changes.forEach(change => { html += `<li>${change}</li>`; });
        html += `</ul>`;
        box.innerHTML = html;
        this.changelogContainer.appendChild(box);
      });
    }

    renderCredits() {
      if (!this.creditsContainer || !window.InfoData) return;
      const credits = window.InfoData.getCredits();
      this.creditsContainer.innerHTML = "";

      credits.forEach(section => {
        const box = document.createElement('div');
        box.className = "themed-info-box";
        box.style.marginBottom = "10px";

        let html = `
          <div class="info-version-badge">${section.category}</div>
          <ul class="dialog-list">
        `;
        section.items.forEach(item => {
          if (item.role) {
            html += `<li><strong>${item.role}:</strong> ${item.name}</li>`;
          } else {
            html += `<li>${item.name}</li>`;
          }
        });
        html += `</ul>`;
        box.innerHTML = html;
        this.creditsContainer.appendChild(box);
      });
    }
  }

  window.InfoUI = InfoUI;
})();