export const PRODUCTS = [
  {
    id: 'pellets',
    name: 'Biomass Pellets',
    image: require('@/assets/images/product-pellets.png'),
    price: 8.5,
    unit: 'kg',
    tag: 'Most Used 🔥',
    tagColor: '#F59E0B',
    gcv: '4200 Kcal/kg',
    ash: '< 3%',
    description: 'Premium quality biomass pellets made from agro residue',
    suitableFor: 'Boilers, Gasifiers, Direct combustion',
    sizes: ['6mm', '8mm', '10mm'],
  },
  {
    id: 'briquettes',
    name: 'Biomass Stove',
    image: require('@/assets/images/product-stove.png'),
    price: 7.0,
    unit: 'kg',
    tag: 'Eco Choice 🌿',
    tagColor: '#1DB954',
    gcv: '3800 Kcal/kg',
    ash: '< 5%',
    description: 'Compressed biomass briquettes for industrial use',
    suitableFor: 'Industrial dryers, Brick kilns',
    sizes: ['1kg', '3kg', '5kg', '10kg', '15kg', '25kg'],
  },
  {
    id: 'chips',
    name: 'Biomass Burner',
    image: require('@/assets/images/product-burner.png'),
    price: 5.5,
    unit: 'kg',
    tag: 'Best Value 💰',
    tagColor: '#3B82F6',
    gcv: '3500 Kcal/kg',
    ash: '< 7%',
    description: 'Natural wood chips for biomass gasifiers',
    suitableFor: 'Gasifiers, Biomass boilers',
    sizes: ['50kw', '100kw', '150kw', '200kw', '250kw', '300kw'],
  },
];

export const PURPOSES = [
  { id: 'kitchen', label: 'Commercial Kitchen' },
  { id: 'dryer', label: 'Industrial Dryer' },
];

export const SUB_PURPOSES: Record<string, string[]> = {
  kitchen: [
    'Restaurant Kitchen',
    'Hotel Kitchen',
    'Catering Service',
    'Food Court',
    'Canteen',
  ],
  dryer: [
    'Textile Dryer',
    'Food Processing Dryer',
    'Pharmaceutical Dryer',
    'Chemical Dryer',
    'Agricultural Dryer',
  ],
};

export const DELIVERY_FEE = 150;
