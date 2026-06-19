const STORAGE_KEY = 'pdf_repository_dashboard';
const repository = [];
const CUSTOM_PASSWORD_KEY = 'custom_admin_password';
const DEFAULT_PASSWORD = 'Oyinberry21.';

const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const toast = document.getElementById('toast');
const statusBanner = document.getElementById('statusBanner');
const statusMessage = document.getElementById('statusMessage');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const repositoryList = document.getElementById('repositoryList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const selectAllButton = document.getElementById('selectAllButton');
const downloadSelectedButton = document.getElementById('downloadSelectedButton');
const downloadAllButton = document.getElementById('downloadAllButton');
const deleteSelectedButton = document.getElementById('deleteSelectedButton');
const clearAllButton = document.getElementById('clearAllButton');
const selectedCount = document.getElementById('selectedCount');
const selectionBadge = document.getElementById('selectionBadge');
const dashboardContainer = document.getElementById('dashboardContainer');

function saveRepository() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repository));
    return true;
  } catch (error) {
    console.error('Failed to save repository:', error);
    return false;
  }
}

function loadRepository() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return;

  try {
    const parsed = JSON.parse(savedData);
    if (Array.isArray(parsed)) {
      repository.length = 0;
      repository.push(...parsed);
    }
  } catch (error) {
    console.error('Failed to load repository:', error);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}

function formatFileSize(sizeInKB) {
  const size = Number(sizeInKB);
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} MB`;
  }
  return `${size.toFixed(2)} KB`;
}

function updateSelectedCount() {
  const selectedItems = repositoryList.querySelectorAll('.repository-item.selected');
  const count = selectedItems.length;
  selectedCount.textContent = `${count} selected`;
  selectionBadge.textContent = count ? `${count} item(s) chosen` : 'No selection';
}

function sortRepository(items) {
  const sortMode = sortSelect.value;

  if (sortMode === 'date') {
    return items.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  return items.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function showProgress(value) {
  progressBar.style.display = 'block';
  progressFill.style.width = `${value}%`;
}

function hideProgress() {
  progressBar.style.display = 'none';
  progressFill.style.width = '0%';
}

function showStatus(message) {
  statusMessage.textContent = message;
  statusBanner.style.display = 'flex';
  clearTimeout(showStatus.timeout);
  showStatus.timeout = setTimeout(() => {
    statusBanner.style.display = 'none';
    statusMessage.textContent = '';
  }, 3000);
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function showDashboard() {
  loadRepository();
  renderRepository();
}

function renderRepository() {
  const query = searchInput.value.toLowerCase();
  repositoryList.innerHTML = '';

  const filteredItems = sortRepository(repository).filter(item => item.name.toLowerCase().includes(query));
  let visibleCount = 0;

  for (let i = 0; i < filteredItems.length; i++) {
    const item = filteredItems[i];
    visibleCount++;

    const listItem = document.createElement('li');
    listItem.className = 'repository-item';
    listItem.dataset.name = item.name;

    listItem.addEventListener('click', function () {
      listItem.classList.toggle('selected');
      updateSelectedCount();
    });

    const meta = document.createElement('div');
    meta.className = 'file-meta';

    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = item.name;

    const fileSize = document.createElement('span');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(item.size);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const downloadButton = document.createElement('a');
    downloadButton.className = 'download-btn';
    downloadButton.href = item.url;
    downloadButton.download = item.name;
    downloadButton.textContent = 'Download';

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-btn';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', function (event) {
      event.stopPropagation();
      const confirmDelete = confirm(`Delete ${item.name}?`);
      if (!confirmDelete) return;

      const index = repository.indexOf(item);
      if (index !== -1) {
        repository.splice(index, 1);
      }
      saveRepository();
      renderRepository();
      showToast(`${item.name} deleted`, 'warning');
    });

    meta.appendChild(fileName);
    meta.appendChild(fileSize);
    actions.appendChild(downloadButton);
    actions.appendChild(removeButton);
    listItem.appendChild(meta);
    listItem.appendChild(actions);
    repositoryList.appendChild(listItem);
  }

  if (visibleCount === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = '<div class="empty-state-icon">📄</div><strong>No files found</strong><span>Upload a PDF or clear the search.</span>';
    repositoryList.appendChild(emptyState);
  }

  updateSelectedCount();
}

uploadButton.addEventListener('click', async function () {
  const files = fileInput.files;
  let successCount = 0;
  let failedCount = 0;

  if (!files.length) {
    showStatus('Please choose at least one PDF file.');
    return;
  }

  showProgress(0);

  let storageFull = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progressValue = Math.round(((i + 1) / files.length) * 100);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      failedCount++;
      showProgress(progressValue);
      continue;
    }

    if (storageFull) {
      failedCount++;
      showProgress(progressValue);
      continue;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      const fileSizeInKB = file.size / 1024;

      repository.push({
        name: file.name,
        size: fileSizeInKB,
        url: dataUrl,
        addedAt: Date.now()
      });

      if (saveRepository()) {
        successCount++;
      } else {
        repository.pop();
        storageFull = true;
        failedCount++;
      }
    } catch (error) {
      failedCount++;
      console.error('Failed to read file:', error);
    } finally {
      showProgress(progressValue);
    }
  }

  renderRepository();

  if (storageFull) {
    showStatus('Storage is full — delete some files or upload smaller PDFs.');
    showToast('Storage full: some files were not saved', 'error');
  } else {
    showStatus(`Success: ${successCount} ingested, ${failedCount} failed`);
    showToast(`Uploaded ${successCount} PDF(s)`, 'success');
  }

  fileInput.value = '';

  setTimeout(hideProgress, 700);
});

searchInput.addEventListener('input', renderRepository);
sortSelect.addEventListener('change', renderRepository);

selectAllButton.addEventListener('click', function () {
  const visibleItems = repositoryList.querySelectorAll('.repository-item');
  const shouldSelectAll = selectAllButton.textContent === 'Select All';

  visibleItems.forEach(item => {
    item.classList.toggle('selected', shouldSelectAll);
  });

  selectAllButton.textContent = shouldSelectAll ? 'Deselect All' : 'Select All';
  updateSelectedCount();
});

downloadSelectedButton.addEventListener('click', function () {
  const selectedItems = repositoryList.querySelectorAll('.repository-item.selected');
  selectedItems.forEach(item => {
    const downloadLink = item.querySelector('.download-btn');
    if (downloadLink) {
      downloadLink.click();
    }
  });
});

downloadAllButton.addEventListener('click', function () {
  repository.forEach(item => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.click();
  });
});

deleteSelectedButton.addEventListener('click', function () {
  const selectedItems = repositoryList.querySelectorAll('.repository-item.selected');
  if (!selectedItems.length) return;

  const confirmDelete = confirm('Delete selected files?');
  if (!confirmDelete) return;

  selectedItems.forEach(item => {
    const itemName = item.dataset.name;
    const index = repository.findIndex(file => file.name === itemName);
    if (index !== -1) {
      repository.splice(index, 1);
    }
  });

  saveRepository();
  renderRepository();
  showToast('Selected files deleted', 'warning');
});

clearAllButton.addEventListener('click', function () {
  const confirmClear = confirm('Remove all uploaded files?');
  if (!confirmClear) return;

  repository.length = 0;
  saveRepository();
  renderRepository();
  showToast('All files removed', 'warning');
});

showDashboard();
