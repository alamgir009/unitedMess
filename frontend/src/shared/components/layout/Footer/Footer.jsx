import { useTheme } from '@/app/providers/ThemeProvider';
import { Link } from 'react-router-dom';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className="border-t mt-auto"
            style={{ borderColor: 'var(--border-color)' }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                    {/* ── Logo ── */}
                    <Link
                        to="/"
                        className="flex items-center shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                        aria-label="UnitedMess home"
                    >
                        {/* Logo image */}
                        <div className="relative shrink-0">
                            <img
                                src="/assets/icons/unitedmess-icon-1024.png"
                                alt="UnitedMess Logo"
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <span className="font-bold text-base tracking-tight text-foreground leading-none">
                            United<span className="text-gradient">Mess</span>
                        </span>
                    </Link>

                    {/* Links */}
                    <nav aria-label="Footer navigation">
                        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground" role="list">
                            {[
                                { label: 'Privacy', href: '/privacy' },
                                { label: 'Terms', href: '/terms' },
                                { label: 'Contact', href: '/contact' },
                                { label: 'About', href: '/about' },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="hover:text-foreground transition-colors duration-150"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Copyright */}
                    <p className="text-sm text-muted-foreground">
                        &copy; {currentYear} UnitedMess. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
