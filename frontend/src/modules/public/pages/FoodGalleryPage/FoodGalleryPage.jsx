import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMagnifyingGlass, HiOutlineFire, HiOutlineClock,
    HiOutlineStar, HiOutlineXMark, HiOutlineSparkles,
    HiOutlineTag,
} from 'react-icons/hi2';
import { MdOutlineFreeBreakfast, MdOutlineLunchDining, MdOutlineDinnerDining } from 'react-icons/md';
import { TbToolsKitchen2 } from 'react-icons/tb';
import { PiCookingPotDuotone } from 'react-icons/pi';
import { BsCupHot } from 'react-icons/bs';

// ─── Optimised image with shimmer placeholder ───
const FoodImage = ({ src, alt, className }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="relative w-full h-full overflow-hidden bg-muted/30">
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/60 to-muted" />
            )}
            <img
                src={src} alt={alt} loading="lazy"
                onLoad={() => setLoaded(true)}
                className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ objectFit: 'cover' }}
            />
        </div>
    );
};

// ─── Category icon map ───
const CAT_ICONS = {
    All: <HiOutlineSparkles className="w-4 h-4" />,
    Breakfast: <MdOutlineFreeBreakfast className="w-4 h-4" />,
    Lunch: <MdOutlineLunchDining className="w-4 h-4" />,
    Dinner: <MdOutlineDinnerDining className="w-4 h-4" />,
    Snacks: <BsCupHot className="w-4 h-4" />,
    Special: <PiCookingPotDuotone className="w-4 h-4" />,
};

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Special'];

const FOODS = [
    // Breakfast
    { id: 1, name: 'Paratha & Egg', category: 'Breakfast', cal: 380, prep: '15 min', rating: 4.8, tag: 'Popular', description: 'Flaky whole-wheat paratha served with a perfectly fried egg and green chutney. A classic morning staple loved by everyone.', image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c4?w=600&auto=format&fit=crop' },
    { id: 2, name: 'Doi Chira', category: 'Breakfast', cal: 210, prep: '5 min', rating: 4.6, tag: 'Light', description: 'Flattened rice soaked in yogurt with banana and a drizzle of molasses. Light, cooling, and energising.', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop' },
    { id: 3, name: 'Ruti & Bhaji', category: 'Breakfast', cal: 290, prep: '20 min', rating: 4.5, tag: null, description: 'Soft whole-wheat flatbread with a spiced mixed vegetable bhaji — a wholesome start to any day.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop' },
    // Lunch
    { id: 4, name: 'Kacchi Biryani', category: 'Lunch', cal: 720, prep: '2.5 hr', rating: 5.0, tag: "Chef's Special", description: 'Slow-dum-cooked mutton biryani with saffron rice, caramelised onions, boiled egg, and raita. A Sunday icon.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop' },
    { id: 5, name: 'Dal Bhat Torkari', category: 'Lunch', cal: 510, prep: '45 min', rating: 4.7, tag: 'Daily', description: 'Comforting lentil dal, steamed rice, and seasonal mixed vegetables — the everyday soul food of the mess.', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop' },
    { id: 6, name: 'Chicken Rezala', category: 'Lunch', cal: 580, prep: '50 min', rating: 4.9, tag: 'Premium', description: 'Tender chicken pieces in a rich, creamy white gravy scented with saffron, cardamom, and rose water.', image: 'https://images.unsplash.com/photo-1604908176997-125f25c813a5?w=600&auto=format&fit=crop' },
    { id: 7, name: 'Hilsa Fish Curry', category: 'Lunch', cal: 490, prep: '30 min', rating: 4.9, tag: 'Seasonal', description: "Ilish mach in a mustard and green chilli sauce — Bangladesh's national treasure on every mess table.", image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop' },
    // Dinner
    { id: 8, name: 'Khichuri', category: 'Dinner', cal: 420, prep: '40 min', rating: 4.6, tag: 'Rainy Day', description: 'The ultimate comfort food — mushy rice and lentils with fried eggplant, boiled egg, and pickle on the side.', image: 'https://images.unsplash.com/photo-1596797038530-2c107aa12cae?w=600&auto=format&fit=crop' },
    { id: 9, name: 'Shahi Paneer', category: 'Dinner', cal: 520, prep: '35 min', rating: 4.5, tag: 'Veg', description: 'Soft paneer cubes in a rich tomato-cashew-cream gravy. A regal, restaurant-quality dish from our mess kitchen.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop' },
    { id: 10, name: 'Mutton Curry', category: 'Dinner', cal: 610, prep: '1.5 hr', rating: 4.8, tag: 'Favourite', description: 'Slow-braised mutton in a deeply spiced curry sauce with whole garam masala. Rich, bold, and deeply satisfying.', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop' },
    // Snacks
    { id: 11, name: 'Singara & Cha', category: 'Snacks', cal: 260, prep: '30 min', rating: 4.9, tag: 'Hot Pick', description: 'Crispy triangular pastry stuffed with spiced potato, served with a steaming cup of milk tea. The 4 PM ritual.', image: 'https://images.unsplash.com/photo-1627662057125-1db9e1c7f0b0?w=600&auto=format&fit=crop' },
    { id: 12, name: 'Piyaju & Beguni', category: 'Snacks', cal: 180, prep: '20 min', rating: 4.7, tag: 'Fried', description: 'Golden lentil fritters and battered eggplant slices — the quintessential Bangladeshi iftar-style snack platter.', image: 'https://images.unsplash.com/photo-1624377642657-0e6f3cdff54c?w=600&auto=format&fit=crop' },
    { id: 13, name: 'Jhalmuri', category: 'Snacks', cal: 130, prep: '5 min', rating: 4.5, tag: 'Spicy', description: 'Puffed rice tossed with mustard oil, onion, cucumber, green chilli, and a squeeze of lime. Addictively good.', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop' },
    // Special
    { id: 14, name: 'Payesh', category: 'Special', cal: 310, prep: '1 hr', rating: 4.9, tag: 'Festival', description: 'Creamy Bengali rice pudding slow-cooked in full-fat milk, cardamom, and palm sugar. Served on special occasions.', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop' },
    { id: 15, name: 'Shemai', category: 'Special', cal: 280, prep: '25 min', rating: 4.8, tag: 'Eid Special', description: 'Roasted vermicelli cooked in sweetened milk with ghee, raisins, and nuts. A celebration in every bite.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop' },
    { id: 16, name: 'Borhani', category: 'Special', cal: 90, prep: '10 min', rating: 4.7, tag: 'Drink', description: 'A tangy spiced yogurt drink with mint, mustard, and cumin — the perfect digestive after a heavy biryani feast.', image: 'https://images.unsplash.com/photo-1551024601-bec78ae704b2?w=600&auto=format&fit=crop' },
];

// ─── Star row ───
const Stars = ({ rating }) => (
    <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
            <HiOutlineStar key={i}
                className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-border'}`}
                style={i < Math.floor(rating) ? { fill: 'currentColor' } : {}}
            />
        ))}
        <span className="ml-1 text-xs font-semibold text-foreground">{rating}</span>
    </span>
);

// ─── Food card ───
const FoodCard = ({ food, onSelect }) => (
    <motion.div
        layoutId={`food-card-${food.id}`}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => onSelect(food)}
        className="group cursor-pointer flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300"
    >
        {/* Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
            <FoodImage src={food.image} alt={food.name} className="w-full h-full transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {food.tag && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10">
                    <HiOutlineTag className="w-2.5 h-2.5" />
                    {food.tag}
                </span>
            )}

            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] font-semibold backdrop-blur-sm border border-white/10">
                {CAT_ICONS[food.category]}
                {food.category}
            </span>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3 flex-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground text-base leading-tight">{food.name}</h3>
                <Stars rating={food.rating} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">{food.description}</p>
            <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <HiOutlineFire className="w-3.5 h-3.5 text-orange-500" />
                    {food.cal} kcal
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="inline-flex items-center gap-1">
                    <HiOutlineClock className="w-3.5 h-3.5 text-blue-500" />
                    {food.prep}
                </span>
                <span className="ml-auto text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    View <TbToolsKitchen2 className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.06), transparent 70%)' }} />
    </motion.div>
);

// ─── Detail modal ───
const FoodModal = ({ food, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
    >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-xl" />

        <motion.div
            layoutId={`food-card-${food.id}`}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden bg-card border border-border shadow-2xl"
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
            {/* Hero */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                <FoodImage src={food.image} alt={food.name} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Close */}
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    aria-label="Close"
                >
                    <HiOutlineXMark className="w-4 h-4" />
                </button>

                {/* Bottom overlay */}
                <div className="absolute bottom-4 left-5 right-14">
                    <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{food.name}</h2>
                    <span className="inline-flex items-center gap-1 text-white/70 text-sm mt-0.5">
                        {CAT_ICONS[food.category]}
                        {food.category}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-7">
                <div className="flex items-center justify-between mb-4">
                    {food.tag && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest">
                            <HiOutlineTag className="w-3 h-3" />
                            {food.tag}
                        </span>
                    )}
                    <Stars rating={food.rating} />
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">{food.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
                        <HiOutlineFire className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                        <p className="text-base font-bold text-foreground">{food.cal} kcal</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
                        <HiOutlineClock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-base font-bold text-foreground">{food.prep}</p>
                        <p className="text-xs text-muted-foreground">Prep Time</p>
                    </div>
                </div>

                <button onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
                >
                    <HiOutlineXMark className="w-4 h-4" /> Close
                </button>
            </div>
        </motion.div>
    </motion.div>
);

// ─── Main page ───
const FoodGalleryPage = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedFood, setSelectedFood] = useState(null);
    const [search, setSearch] = useState('');

    const filtered = FOODS.filter((f) => {
        const matchCat = activeCategory === 'All' || f.category === activeCategory;
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">

            {/* Ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div className="absolute -top-40 -left-32 w-[580px] h-[580px] rounded-full opacity-45 animate-blob"
                    style={{ background: 'var(--blob-1)', filter: 'blur(80px)' }} />
                <div className="absolute top-[35%] -right-48 w-[640px] h-[640px] rounded-full opacity-35 animate-blob animation-delay-2000"
                    style={{ background: 'var(--blob-2)', filter: 'blur(100px)' }} />
                <div className="absolute -bottom-48 left-[20%] w-[700px] h-[700px] rounded-full opacity-25 animate-blob animation-delay-4000"
                    style={{ background: 'var(--blob-3)', filter: 'blur(120px)' }} />
            </div>

            {/* ── HERO ── */}
            <section className="relative z-10 pt-36 pb-16 px-4 sm:px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6"
                    >
                        <TbToolsKitchen2 className="w-3.5 h-3.5 text-amber-500" />
                        {FOODS.length} dishes & counting
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                        className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter mb-5"
                    >
                        <span className="text-foreground">Mess</span>{' '}
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-text)' }}>
                            Food Gallery
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.25 }}
                        className="text-muted-foreground text-lg mb-8"
                    >
                        Every dish crafted with care — from humble breakfasts to festive spreads.
                    </motion.p>

                    {/* Search */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
                        className="relative max-w-md mx-auto"
                    >
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text" placeholder="Search dishes…"
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-background/80 text-foreground placeholder:text-muted-foreground backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        />
                    </motion.div>
                </div>
            </section>

            {/* ── Category filter pills ── */}
            <section className="relative z-10 px-4 sm:px-6 pb-10">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }}
                        className="flex flex-wrap items-center gap-2 justify-center"
                    >
                        {CATEGORIES.map((cat) => {
                            const active = activeCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className="inline-flex items-center gap-1.5 relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    style={{
                                        color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                                        background: active ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                                        border: active ? 'none' : '1px solid hsl(var(--border))',
                                        boxShadow: active ? '0 4px 14px hsl(var(--primary)/0.35)' : undefined,
                                    }}
                                >
                                    {CAT_ICONS[cat]}
                                    {cat}
                                    {active && (
                                        <motion.span
                                            layoutId="cat-pill"
                                            className="absolute inset-0 rounded-full -z-10"
                                            style={{ background: 'hsl(var(--primary))' }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* ── Grid ── */}
            <section className="relative z-10 px-4 sm:px-6 pb-24">
                <div className="max-w-6xl mx-auto">
                    <p className="text-xs text-muted-foreground mb-6 font-medium uppercase tracking-widest text-center">
                        {filtered.length} dish{filtered.length !== 1 ? 'es' : ''}
                        {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
                        {search && ` matching "${search}"`}
                    </p>

                    <AnimatePresence mode="popLayout">
                        {filtered.length > 0 ? (
                            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {filtered.map((food) => (
                                    <FoodCard key={food.id} food={food} onSelect={setSelectedFood} />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                                <TbToolsKitchen2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">No dishes found. Try a different search.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* Modal */}
            <AnimatePresence>
                {selectedFood && <FoodModal food={selectedFood} onClose={() => setSelectedFood(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default FoodGalleryPage;