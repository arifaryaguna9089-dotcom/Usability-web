

/* Scroll reveal + stagger kartu */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.card, .table-row').forEach((el, i) => el.style.setProperty('--i', i));
    e.target.classList.add('in');
    io.unobserve(e.target);
  });
}, { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

const timelineObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    timelineObserver.unobserve(e.target);
  });
}, { threshold: .15 });
document.querySelectorAll('.steps li, .timeline li').forEach(el => timelineObserver.observe(el));

const progressLists = document.querySelectorAll('.steps, .timeline');
let progressFrame = 0;
function updateProgressLines() {
  progressFrame = 0;
  progressLists.forEach(list => {
    const rect = list.getBoundingClientRect();
    const listTop = window.scrollY + rect.top;
    const start = listTop - window.innerHeight * .72;
    const end = listTop + rect.height - window.innerHeight * .45;
    const progress = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
    list.style.setProperty('--line-progress', progress.toFixed(3));

    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      const threshold = items.length > 1 ? index / (items.length - 1) : 0;
      item.classList.toggle('is-reached', progress >= threshold);
    });
  });
}
function scheduleProgressUpdate() {
  if (progressFrame) return;
  progressFrame = requestAnimationFrame(updateProgressLines);
}
window.addEventListener('scroll', scheduleProgressUpdate, { passive: true });
window.addEventListener('resize', scheduleProgressUpdate);
updateProgressLines();

