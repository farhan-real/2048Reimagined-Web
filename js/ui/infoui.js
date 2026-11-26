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

    formatChangelogEntry(change) {
      const idx = change.indexOf(': ');
      if (idx > 0 && idx < 48 && !change.slice(0, idx).includes('<')) {
        const lead = change.slice(0, idx);
        const body = change.slice(idx + 2);
        return `<li class="changelog-item"><div class="changelog-lead">${lead}</div><div class="changelog-desc">${body}</div></li>`;
      }
      return `<li class="changelog-item"><div class="changelog-desc">${change}</div></li>`;
    }

    renderChangelog() {
      if (!this.changelogContainer || !window.InfoData) return;
      const logs = window.InfoData.getChangelog();
      this.changelogContainer.innerHTML = "";

      logs.forEach((log, index) => {
        const box = document.createElement('div');
        box.className = "themed-info-box changelog-card" + (index === 0 ? " is-latest" : "");

        const latestTag = index === 0 ? `<span class="changelog-latest-pill">Latest</span>` : "";
        const countLabel = `${log.changes.length} ${log.changes.length === 1 ? 'change' : 'changes'}`;
        let html = `
          <div class="changelog-card-header">
            <div class="changelog-meta-row">
              <div class="changelog-meta-left">
                <div class="info-version-badge">${log.version}</div>
                <span class="changelog-count-pill">${countLabel}</span>
              </div>
              ${latestTag}
            </div>
            <div class="changelog-card-title">${log.title}</div>
          </div>
          <ul class="changelog-list">
        `;
        log.changes.forEach(change => {
          html += this.formatChangelogEntry(change);
        });
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

        let html = `
          <div class="info-version-badge">${section.category}</div>
          <ul class="changelog-list">
        `;
        section.items.forEach(item => {
          if (item.role) {
            html += `<li class="changelog-item"><span class="changelog-lead">${item.role}:</span> <span class="changelog-desc">${item.name}</span></li>`;
          } else {
            html += `<li class="changelog-item"><span class="changelog-desc">${item.name}</span></li>`;
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