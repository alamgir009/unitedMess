import {
    HiOutlineSparkles
} from 'react-icons/hi2';
import {
    MdOutlineFreeBreakfast,
    MdOutlineLunchDining,
    MdOutlineDinnerDining,
} from 'react-icons/md';
import { PiCookingPotDuotone } from 'react-icons/pi';
import { BsCupHot } from 'react-icons/bs';

// ─── Category icon map ────────────────────────────────────────────────────────
export const CAT_ICONS = {
    All:       <HiOutlineSparkles className="w-4 h-4" />,
    Breakfast: <MdOutlineFreeBreakfast className="w-4 h-4" />,
    Lunch:     <MdOutlineLunchDining className="w-4 h-4" />,
    Dinner:    <MdOutlineDinnerDining className="w-4 h-4" />,
    Snacks:    <BsCupHot className="w-4 h-4" />,
    Special:   <PiCookingPotDuotone className="w-4 h-4" />
};

export const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Special'];

// ─── Food data ────────────────────────────────────────────────────────────────
export const FOODS = [
    { id: 1,  name: 'Roti Sabji',       category: 'Breakfast', cal: 380, prep: '25 min', rating: 4.8, tag: null,        description: 'Flaky whole-wheat roti served with a perfectly fried egg and green vegetables. A classic morning staple loved by everyone.',                  image: 'https://i.pinimg.com/1200x/65/8e/59/658e59ab174b5895b65f2552964bcd8e.jpg' },
    { id: 2,  name: 'Puri Sabji',       category: 'Breakfast', cal: 210, prep: '5 min',  rating: 4.6, tag: null,          description: 'Flattened rice soaked in yogurt with banana and a drizzle of molasses. Light, cooling, and energising.',                                    image: 'https://i.pinimg.com/1200x/a0/cb/26/a0cb26affdf04e389c4068b11c3739de.jpg' },
    { id: 3,  name: 'Egg & Toast',      category: 'Breakfast', cal: 290, prep: '20 min', rating: 4.5, tag: 'Light',             description: 'Soft whole-wheat flatbread with a spiced mixed Egg fry — a wholesome start to any day.',                                              image: 'https://i.pinimg.com/1200x/6d/f1/58/6df158f0a87668a9b3b7102ebf96583e.jpg' },
    { id: 4,  name: 'Chicken Briyani',  category: 'Lunch',     cal: 720, prep: '2 hr', rating: 5.0, tag: "Chef's Special", description: 'Slow-dum-cooked chicken biryani with saffron rice, caramelised onions, boiled egg, and raita. A Sunday icon.',                             image: 'https://i.pinimg.com/1200x/68/8b/91/688b919427bd06898347cff4033072f8.jpg' },
    { id: 5,  name: 'Dal Bhat Torkari', category: 'Lunch',     cal: 510, prep: '45 min', rating: 4.7, tag: 'Daily',          description: 'Comforting lentil dal, steamed rice, and seasonal mixed vegetables — the everyday soul food of the mess.',                               image: 'https://i.pinimg.com/avif/1200x/ac/83/41/ac83411e16cdbe79b680db16d97241e4.avf' },
    { id: 6,  name: 'Chicken Kosha',    category: 'Lunch',     cal: 580, prep: '50 min', rating: 4.9, tag: 'Premium',        description: 'Tender chicken pieces in a rich, creamy white gravy scented with saffron, cardamom, and rose water.',                                    image: 'https://i.pinimg.com/1200x/c9/b8/c6/c9b8c6b6d07fac4b0bcfd662bbbb30b5.jpg' },
    { id: 7,  name: 'Fish Curry',       category: 'Dinner',     cal: 490, prep: '30 min', rating: 4.9, tag: 'Favourite',       description: "Katla mach in a mustard and green chilli sauce — Benagli treasure on every mess table.",                                               image: 'https://i.pinimg.com/1200x/52/ff/58/52ff58313db58e899574c27af305ee24.jpg' },
    { id: 8,  name: 'Khichuri',         category: 'Dinner',    cal: 420, prep: '40 min', rating: 4.6, tag: 'Rainy Day',      description: 'The ultimate comfort food — mushy rice and lentils with fried eggplant, boiled egg, and pickle on the side.',                            image: 'https://i.pinimg.com/1200x/1e/19/92/1e19923401bc854d9c003586f46f854b.jpg' },
    { id: 9,  name: 'Shahi Paneer',     category: 'Dinner',    cal: 520, prep: '35 min', rating: 4.5, tag: 'Veg',            description: 'Soft paneer cubes in a rich tomato-cashew-cream gravy. A regal, restaurant-quality dish from our mess kitchen.',                         image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop' },
    { id: 10, name: 'Mutton Briyani',   category: 'Dinner',    cal: 610, prep: '2.5 hr', rating: 4.8, tag: 'Favourite',      description: 'Slow-braised mutton in a deeply spiced curry sauce with whole garam masala. Rich, bold, and deeply satisfying.',                         image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop' },
    { id: 11, name: 'Singara & Cha',    category: 'Snacks',    cal: 260, prep: '30 min', rating: 4.9, tag: 'Hot Pick',       description: 'Crispy triangular pastry stuffed with spiced potato, served with a steaming cup of milk tea. The 4 PM ritual.',                          image: 'https://i.pinimg.com/1200x/91/29/e3/9129e3977edf5f0c4244034bce72fa89.jpg' },
    { id: 12, name: 'Piyaju & Beguni',  category: 'Snacks',    cal: 180, prep: '20 min', rating: 4.7, tag: 'Fried',          description: 'Golden lentil fritters and battered eggplant slices — the quintessential Bengal iftar-style snack platter.',                             image: 'https://i.pinimg.com/1200x/93/ab/ba/93abbaa38d452b762ea1451e4ea85ce3.jpg' },
    { id: 13, name: 'Jhalmuri',         category: 'Snacks',    cal: 130, prep: '5 min',  rating: 4.5, tag: 'Spicy',          description: 'Puffed rice tossed with mustard oil, onion, cucumber, green chilli, and a squeeze of lime. Addictively good.',                           image: 'https://i.pinimg.com/1200x/22/7d/40/227d401a7fc794f495f47203072315b9.jpg' },
    { id: 14, name: 'Payesh',           category: 'Special',   cal: 310, prep: '1 hr',   rating: 4.9, tag: 'Eid Special',       description: 'Creamy Bengali rice pudding slow-cooked in full-fat milk, cardamom, and palm sugar. Served on special occasions.',                    image: 'https://i.pinimg.com/1200x/00/f6/1a/00f61a59047d9ab2636945a82a734b72.jpg' },
    { id: 15, name: 'Mutton Curry',     category: 'Special',   cal: 450, prep: '1.30 hr', rating: 4.8, tag: 'Spicy',    description: 'Juicy tender Mutton cooked in sweetened milk with ghee, raisins, and nuts. A celebration in every bite.',                                        image: 'https://i.pinimg.com/1200x/51/14/43/51144306d01edccf668f3be1817ea378.jpg' },
    { id: 16, name: 'Sorse Ilsh',       category: 'Special',   cal: 480,  prep: '45 min', rating: 4.7, tag: null,          description: 'Ilish mach in a mustard and Red chilli sauce — Benagli treasure on every mess table.',                                                      image: 'https://i.pinimg.com/1200x/d0/37/2d/d0372da656edeb4c4e0fd2ea2a68d84a.jpg' },
    { id: 17, name: 'Egg Curry',       category: 'Lunch',   cal: 90,  prep: '45 min', rating: 4.6, tag: 'Favourite',          description: 'Egg Curry in a mustard and Red tomato sauce — Benagli treasure on every mess table.',                                                      image: 'https://i.pinimg.com/1200x/78/45/00/7845000c64d3ddd3feebd3bf9a975ada.jpg' },
    { id: 18, name: 'Alu Posto',       category: 'Lunch',   cal: 120,  prep: '50 min', rating: 4.6, tag: null,          description: 'Alu Posto — potatoes in creamy poppy seed paste, a classic Bengali comfort dish.',                                                      image: 'https://i.pinimg.com/1200x/69/9c/67/699c67c4625e5f10c317b5198337047b.jpg' },
    { id: 19, name: 'Soyabin Alu',       category: 'Lunch',   cal: 320,  prep: '35 min', rating: 4.3, tag: null,          description: 'Soyabin Alu — soya chunks and potatoes cooked in a light, homestyle Bengali gravy.',                                                      image: 'https://i.pinimg.com/1200x/89/b8/66/89b866a2e51ed789a3fb429f0481cfe8.jpg' },
    { id: 20, name: 'Begun Bhorta',       category: 'Lunch',   cal: 110,  prep: '20 min', rating: 4.5, tag: null,          description: 'Begun Bhorta — smoky mashed eggplant with mustard oil, onion, and green chilli.',                                                      image: 'https://i.pinimg.com/1200x/f1/ae/c0/f1aec052a49293e6e88527dfaa8bd8b6.jpg' },
];