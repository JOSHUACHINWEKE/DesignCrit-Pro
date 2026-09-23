let active = 0;
const queue = [];
const MAX_CONCURRENT = 2;

function drain() {
  while (active < MAX_CONCURRENT && queue.length) {
    const next = queue.shift();
    active += 1;
    Promise.resolve(next.task())
      .then(next.resolve)
      .catch(next.reject)
      .finally(() => {
        active -= 1;
        drain();
      });
  }
}

export function queueAnalysis(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    drain();
  });
}

export function analysisQueueStats() {
  return { active, waiting: queue.length, maxConcurrent: MAX_CONCURRENT };
}
