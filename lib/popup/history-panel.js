// lib/popup/history-panel.js - Version history display, preview, and restore
import { i18n } from '../../i18n-manager.js';
import { escapeHtml, renderMarkdown, formatRelativeTime, showToast } from './utils.js';

/**
 * HistoryPanel manages the prompt version history modal.
 * SRP: Display, preview, and restore historical versions of a prompt.
 */
export class HistoryPanel {
    constructor() {
        this.currentHistory = [];
        this.previewingVersionId = null;
        this.editingId = null;
    }

    /**
     * Show the history modal for a given prompt ID.
     * @param {string} promptId
     */
    async show(promptId) {
        if (!promptId) return;
        this.editingId = promptId;
        const response = await chrome.runtime.sendMessage({ type: 'GET_PROMPT_HISTORY', id: promptId });
        if (response.success) {
            this.currentHistory = response.versions;
            this._renderList();
            document.getElementById('historyModal').classList.remove('hidden');
            if (this.currentHistory.length > 0) {
                this.previewVersion(this.currentHistory[0].versionId);
            } else {
                document.getElementById('diffContent').textContent = i18n.t('noHistoryYet') || 'No history yet.';
                document.getElementById('restoreBtn').classList.add('hidden');
            }
        }
    }

    /** Hide the history modal. */
    hide() {
        document.getElementById('historyModal').classList.add('hidden');
    }

    /** Render the version list inside the history modal. */
    _renderList() {
        const list = document.getElementById('historyList');
        list.innerHTML = this.currentHistory.map(v => `
      <div class="history-item" data-version-id="${v.versionId}">
        <div class="version-time">${formatRelativeTime(v.timestamp)}</div>
        <div class="version-preview">${escapeHtml(v.content.substring(0, 40))}...</div>
      </div>
    `).join('');
    }

    /**
     * Preview a specific version in the diff pane.
     * @param {string} versionId
     */
    previewVersion(versionId) {
        const version = this.currentHistory.find(v => v.versionId === versionId);
        if (!version) return;

        this.previewingVersionId = versionId;
        const content = document.getElementById('diffContent');
        content.innerHTML = renderMarkdown(version.content);

        document.getElementById('restoreBtn').classList.remove('hidden');

        // Highlight active item
        document.querySelectorAll('.history-item').forEach(el => {
            el.classList.toggle('active', el.dataset.versionId === versionId);
        });
    }

    /**
     * Restore the currently previewed version into the editor textarea.
     * @returns {boolean} true if restored successfully
     */
    async restoreVersion() {
        if (!this.previewingVersionId || !this.editingId) return false;

        const version = this.currentHistory.find(v => v.versionId === this.previewingVersionId);
        if (version) {
            // Call backend to restore (creates audit snapshot before restoring)
            await chrome.runtime.sendMessage({
                type: 'RESTORE_PROMPT_VERSION',
                id: this.editingId,
                versionId: this.previewingVersionId
            });
            
            document.getElementById('contentInput').value = version.content;
            this.hide();
            showToast(i18n.t('restoreSuccess') || 'Restored');
            return true;
        }
        return false;
    }
}
