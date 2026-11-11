export function initNavbar() {
    const navigation = document.getElementById('navigation');
    const menuToggle = document.getElementById('menuToggle');
    const semuaHalaman = Array.from(document.querySelectorAll('main .page-view'));

    if (!semuaHalaman.length) return;

    const riwayatHalaman = [];
    let halamanAktif = 'beranda';

    function bukaHalaman(id, opsi = {}) {
        const target = document.getElementById(id);
        if (!target || !target.classList.contains('page-view')) return;

        const { simpanRiwayat = true, ubahURL = true } = opsi;
        if (id === halamanAktif) return;

        if (simpanRiwayat) riwayatHalaman.push(halamanAktif);
        halamanAktif = id;

        semuaHalaman.forEach(halaman => {
            halaman.classList.toggle('active-page', halaman.id === id);
        });

        document.querySelectorAll('.navbar a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });

        if (ubahURL) history.pushState({ halaman: id }, '', `#${id}`);

        navigation?.classList.remove('open');
        menuToggle?.setAttribute('aria-expanded', 'false');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        window.dispatchEvent(new CustomEvent('spmb:halaman-dibuka', { detail: { id } }));
    }

    window.bukaHalamanSPMB = bukaHalaman;

    document.querySelectorAll('[data-back]').forEach(tombol => {
        tombol.addEventListener('click', () => {
            const sebelumnya = riwayatHalaman.pop() || 'beranda';
            bukaHalaman(sebelumnya, { simpanRiwayat: false });
        });
    });

    if (menuToggle && navigation) {
        menuToggle.addEventListener('click', () => {
            const terbuka = navigation.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', String(terbuka));
        });
    }

    document.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const id = link.getAttribute('href').substring(1);
        const target = document.getElementById(id);
        if (!target || !target.classList.contains('page-view')) return;

        event.preventDefault();
        bukaHalaman(id);
    });

    window.addEventListener('popstate', () => {
        const id = location.hash.substring(1) || 'beranda';
        bukaHalaman(id, { simpanRiwayat: false, ubahURL: false });
    });

    const hashAwal = location.hash.substring(1);
    const halamanAwal = semuaHalaman.some(halaman => halaman.id === hashAwal) ? hashAwal : 'beranda';

    semuaHalaman.forEach(halaman => {
        halaman.classList.toggle('active-page', halaman.id === halamanAwal);
    });
    halamanAktif = halamanAwal;
}