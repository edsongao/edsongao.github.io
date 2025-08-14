/* Optional: smooth scroll for internal links */
document.querySelectorAll('a[href^="#"]').forEach(a => {
a.addEventListener('click', e => {
const target = document.querySelector(a.getAttribute('href'));
if (target) {
e.preventDefault();
target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
});
});

/* Helper to swap placeholders with images later */
function setProjectImage(id, src, alt) {
const el = document.getElementById(id);
if (!el) return;
if (src) {
el.outerHTML = <img src="${src}" alt="${alt || 'project image'}">;
}
}

window.Portfolio = { setProjectImage };

