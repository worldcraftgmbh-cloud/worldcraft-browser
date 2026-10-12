'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { DownloadService, MAX_HISTORY_ITEMS } = require('../services/download-service');

test('Downloads: calculateMetrics accurate calculation and edge cases', () => {
  // Normal progress
  const m1 = DownloadService.calculateMetrics(500, 1000, 0, 1000);
  assert.equal(m1.percent, 50);
  assert.equal(m1.hasTotal, true);
  assert.equal(m1.speed, 500); // 500 bytes in 1s = 500 B/s

  // 100% complete
  const m2 = DownloadService.calculateMetrics(1024, 1024, 512, 500);
  assert.equal(m2.percent, 100);
  assert.equal(m2.hasTotal, true);
  assert.equal(m2.speed, 1024); // 512 bytes in 500ms = 1024 B/s

  // 0 bytes received
  const m3 = DownloadService.calculateMetrics(0, 5000, 0, 1000);
  assert.equal(m3.percent, 0);
  assert.equal(m3.speed, 0);

  // Unknown total size (e.g. streaming or chunked without Content-Length)
  const m4 = DownloadService.calculateMetrics(2048, -1, 1024, 1000);
  assert.equal(m4.percent, null);
  assert.equal(m4.hasTotal, false);
  assert.equal(m4.speed, 1024);

  const m5 = DownloadService.calculateMetrics(2048, 0, 0, 1000);
  assert.equal(m5.percent, null);
  assert.equal(m5.hasTotal, false);

  // Received exceeds total (clamped to 100%)
  const m6 = DownloadService.calculateMetrics(1500, 1000, 1000, 1000);
  assert.equal(m6.percent, 100);

  // Invalid or zero time delta
  const m7 = DownloadService.calculateMetrics(100, 200, 0, 0);
  assert.equal(m7.speed, 0);

  // Negative delta
  const m8 = DownloadService.calculateMetrics(50, 200, 100, 1000);
  assert.equal(m8.speed, 0);
});

test('Downloads: sanitizeFileName path traversal and illegal character stripping', () => {
  const service = new DownloadService(os.tmpdir());

  // Standard safe names
  assert.equal(service.sanitizeFileName('cyber_neural_patch.zip'), 'cyber_neural_patch.zip');

  // Path traversal attempts
  assert.equal(service.sanitizeFileName('../../../etc/passwd'), 'passwd');
  assert.equal(service.sanitizeFileName('..\\..\\Windows\\System32\\calc.exe'), 'calc.exe');
  assert.equal(service.sanitizeFileName('/var/log/syslog'), 'syslog');

  // Illegal Windows filename characters: <>:"/\|?*
  assert.equal(service.sanitizeFileName('matrix<data>:stream"file|part?*.iso'), 'matrix_data__stream_file_part__.iso');

  // Empty or invalid input fallback
  assert.equal(service.sanitizeFileName(''), 'download');
  assert.equal(service.sanitizeFileName(null), 'download');
  assert.equal(service.sanitizeFileName(undefined), 'download');
  assert.equal(service.sanitizeFileName(12345), 'download');

  // Length clamp to 255 chars
  const veryLongName = 'a'.repeat(300) + '.txt';
  const sanitized = service.sanitizeFileName(veryLongName);
  assert.equal(sanitized.length, 255);
});

test('Downloads: Atomic persistence and history recovery', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-dl-test-'));
  try {
    const service = new DownloadService(tempDir);
    await service.init();
    assert.deepEqual(service.getDownloads(), []);

    // Push simulated history item
    service.history.push({
      id: 'dl-test-1',
      fileName: 'matrix_core.bin',
      url: 'https://worldcraft.local/matrix_core.bin',
      savePath: path.join(tempDir, 'matrix_core.bin'),
      totalBytes: 1048576,
      receivedBytes: 1048576,
      percent: 100,
      speed: 0,
      state: 'completed',
      startTime: Date.now() - 5000,
      endTime: Date.now(),
      error: null
    });

    await service._atomicWriteHistory();

    // Verify written to disk
    const historyFilePath = path.join(tempDir, 'downloads.json');
    assert.equal(fs.existsSync(historyFilePath), true);

    // Create a new service instance reading the saved file
    const service2 = new DownloadService(tempDir);
    await service2.init();
    const list = service2.getDownloads();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'dl-test-1');
    assert.equal(list[0].fileName, 'matrix_core.bin');
    assert.equal(list[0].state, 'completed');

    // Corrupt the history file and verify recovery
    fs.writeFileSync(historyFilePath, '<<< MALFORMED CYBER CORRUPT DATA >>>', 'utf8');

    const service3 = new DownloadService(tempDir);
    await service3.init();
    assert.deepEqual(service3.getDownloads(), []);

    // A backup copy must have been generated
    const allFiles = fs.readdirSync(tempDir);
    const hasBackup = allFiles.some((f) => f.includes('downloads.json.corrupt.'));
    assert.equal(hasBackup, true, 'Corrupt backup file must exist');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Downloads: Rejection of invalid IDs and status validation', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-dl-actions-'));
  try {
    let openedPath = null;
    let showedPath = null;

    const mockShell = {
      openPath: async (p) => {
        openedPath = p;
        return '';
      },
      showItemInFolder: (p) => {
        showedPath = p;
      }
    };

    const service = new DownloadService(tempDir, { shell: mockShell });
    await service.init();

    // Null / empty IDs
    const resEmptyOpen = await service.openDownload('');
    assert.equal(resEmptyOpen.ok, false);

    const resEmptyShow = await service.showInFolder('');
    assert.equal(resEmptyShow.ok, false);

    const resEmptyCancel = await service.cancelDownload('');
    assert.equal(resEmptyCancel.ok, false);

    const resNonExistent = await service.openDownload('non-existent-id');
    assert.equal(resNonExistent.ok, false);
    assert.equal(resNonExistent.error.includes('nicht gefunden'), true);

    // Create dummy downloaded file
    const targetFilePath = path.join(tempDir, 'test-download.pdf');
    fs.writeFileSync(targetFilePath, 'dummy pdf content', 'utf8');

    // Insert progressing item
    service.history.push({
      id: 'dl-progressing',
      fileName: 'test-download.pdf',
      savePath: targetFilePath,
      state: 'progressing',
      percent: 45
    });

    // Attempting to open progressing file should fail
    const resOpenProgressing = await service.openDownload('dl-progressing');
    assert.equal(resOpenProgressing.ok, false);
    assert.equal(resOpenProgressing.error.includes('noch nicht fertig'), true);

    // Insert completed item with existing file
    service.history.push({
      id: 'dl-done',
      fileName: 'test-download.pdf',
      savePath: targetFilePath,
      state: 'completed',
      percent: 100
    });

    const resOpenDone = await service.openDownload('dl-done');
    assert.equal(resOpenDone.ok, true);
    assert.equal(openedPath, targetFilePath);

    const resShowDone = await service.showInFolder('dl-done');
    assert.equal(resShowDone.ok, true);
    assert.equal(showedPath, targetFilePath);

    // Remove deleted file from disk and attempt to open
    fs.unlinkSync(targetFilePath);
    const resOpenMissing = await service.openDownload('dl-done');
    assert.equal(resOpenMissing.ok, false);
    assert.equal(resOpenMissing.error.includes('existiert nicht mehr'), true);

    // History deletion and clearing
    const removeRes = await service.removeHistoryEntry('dl-done');
    assert.equal(removeRes.ok, true);
    assert.equal(service.getDownloads().some((d) => d.id === 'dl-done'), false);

    // Clear completed
    const clearRes = await service.clearCompleted();
    assert.equal(clearRes.ok, true);
    assert.equal(service.getDownloads().length, 1);
    assert.equal(service.getDownloads()[0].id, 'dl-progressing');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
