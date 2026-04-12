import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const TEMPLATE_DECKS = [
  {
    id: 'template_presidents',
    name: 'US Presidents in Order',
    emoji: '🇺🇸',
    description: '47 presidents — question is the number, answer is the name',
    cards: [
      { front: 'Who was the 1st president?', back: 'George Washington' },
      { front: 'Who was the 2nd president?', back: 'John Adams' },
      { front: 'Who was the 3rd president?', back: 'Thomas Jefferson' },
      { front: 'Who was the 4th president?', back: 'James Madison' },
      { front: 'Who was the 5th president?', back: 'James Monroe' },
      { front: 'Who was the 6th president?', back: 'John Quincy Adams' },
      { front: 'Who was the 7th president?', back: 'Andrew Jackson' },
      { front: 'Who was the 8th president?', back: 'Martin Van Buren' },
      { front: 'Who was the 9th president?', back: 'William Henry Harrison' },
      { front: 'Who was the 10th president?', back: 'John Tyler' },
      { front: 'Who was the 11th president?', back: 'James K. Polk' },
      { front: 'Who was the 12th president?', back: 'Zachary Taylor' },
      { front: 'Who was the 13th president?', back: 'Millard Fillmore' },
      { front: 'Who was the 14th president?', back: 'Franklin Pierce' },
      { front: 'Who was the 15th president?', back: 'James Buchanan' },
      { front: 'Who was the 16th president?', back: 'Abraham Lincoln' },
      { front: 'Who was the 17th president?', back: 'Andrew Johnson' },
      { front: 'Who was the 18th president?', back: 'Ulysses S. Grant' },
      { front: 'Who was the 19th president?', back: 'Rutherford B. Hayes' },
      { front: 'Who was the 20th president?', back: 'James A. Garfield' },
      { front: 'Who was the 21st president?', back: 'Chester A. Arthur' },
      { front: 'Who was the 22nd president?', back: 'Grover Cleveland' },
      { front: 'Who was the 23rd president?', back: 'Benjamin Harrison' },
      { front: 'Who was the 24th president?', back: 'Grover Cleveland' },
      { front: 'Who was the 25th president?', back: 'William McKinley' },
      { front: 'Who was the 26th president?', back: 'Theodore Roosevelt' },
      { front: 'Who was the 27th president?', back: 'William Howard Taft' },
      { front: 'Who was the 28th president?', back: 'Woodrow Wilson' },
      { front: 'Who was the 29th president?', back: 'Warren G. Harding' },
      { front: 'Who was the 30th president?', back: 'Calvin Coolidge' },
      { front: 'Who was the 31st president?', back: 'Herbert Hoover' },
      { front: 'Who was the 32nd president?', back: 'Franklin D. Roosevelt' },
      { front: 'Who was the 33rd president?', back: 'Harry S. Truman' },
      { front: 'Who was the 34th president?', back: 'Dwight D. Eisenhower' },
      { front: 'Who was the 35th president?', back: 'John F. Kennedy' },
      { front: 'Who was the 36th president?', back: 'Lyndon B. Johnson' },
      { front: 'Who was the 37th president?', back: 'Richard Nixon' },
      { front: 'Who was the 38th president?', back: 'Gerald Ford' },
      { front: 'Who was the 39th president?', back: 'Jimmy Carter' },
      { front: 'Who was the 40th president?', back: 'Ronald Reagan' },
      { front: 'Who was the 41st president?', back: 'George H.W. Bush' },
      { front: 'Who was the 42nd president?', back: 'Bill Clinton' },
      { front: 'Who was the 43rd president?', back: 'George W. Bush' },
      { front: 'Who was the 44th president?', back: 'Barack Obama' },
      { front: 'Who was the 45th president?', back: 'Donald Trump' },
      { front: 'Who was the 46th president?', back: 'Joe Biden' },
      { front: 'Who was the 47th president?', back: 'Donald Trump' },
    ],
  },
  {
    id: 'template_thai',
    name: 'Common Thai Phrases',
    emoji: '🇹🇭',
    description: '20 everyday Thai phrases — pronunciation to English',
    cards: [
      { front: 'Sawasdee', back: 'Hello / Goodbye' },
      { front: 'Khob khun', back: 'Thank you' },
      { front: 'Mai pen rai', back: "Never mind / It's okay" },
      { front: 'Chai', back: 'Yes' },
      { front: 'Mai chai', back: 'No' },
      { front: 'Sabai dee mai?', back: 'How are you?' },
      { front: 'Sabai dee', back: "I'm fine" },
      { front: 'Aroy', back: 'Delicious' },
      { front: 'Nit noi', back: 'A little' },
      { front: 'Thao rai?', back: 'How much?' },
      { front: 'Phaeng', back: 'Expensive' },
      { front: 'Lot raakha dai mai?', back: 'Can you lower the price?' },
      { front: 'Hong naam yoo tee nai?', back: 'Where is the bathroom?' },
      { front: 'Chuay duay!', back: 'Help me!' },
      { front: 'Yoo tee nai?', back: 'Where is it?' },
      { front: 'Gin khao', back: 'Eat a meal (literally: eat rice)' },
      { front: 'Pood thai mai dai', back: "I can't speak Thai" },
      { front: 'La gorn', back: 'Goodbye' },
      { front: 'Sanuk', back: 'Fun' },
      { front: 'Kin naam', back: 'Drink water' },
    ],
  },
  {
    id: 'template_spanish',
    name: 'Common Spanish Phrases',
    emoji: '🇪🇸',
    description: '20 essential Spanish phrases with English translations',
    cards: [
      { front: 'Hola', back: 'Hello' },
      { front: 'Por favor', back: 'Please' },
      { front: 'Gracias', back: 'Thank you' },
      { front: 'De nada', back: "You're welcome" },
      { front: '¿Cómo estás?', back: 'How are you?' },
      { front: 'Bien, gracias', back: 'Fine, thank you' },
      { front: '¿Hablas inglés?', back: 'Do you speak English?' },
      { front: 'No entiendo', back: "I don't understand" },
      { front: '¿Cuánto cuesta?', back: 'How much does it cost?' },
      { front: '¿Dónde está el baño?', back: 'Where is the bathroom?' },
      { front: '¿Me puede ayudar?', back: 'Can you help me?' },
      { front: 'Lo siento', back: "I'm sorry" },
      { front: 'Por supuesto', back: 'Of course' },
      { front: '¿Qué hora es?', back: 'What time is it?' },
      { front: 'Tengo hambre', back: "I'm hungry" },
      { front: '¿Dónde está...?', back: 'Where is...?' },
      { front: 'La cuenta, por favor', back: 'The bill, please' },
      { front: '¿Qué es esto?', back: 'What is this?' },
      { front: 'No sé', back: "I don't know" },
      { front: 'Adiós', back: 'Goodbye' },
    ],
  },
  {
    id: 'template_coding',
    name: 'Coding Terms for Beginners',
    emoji: '💻',
    description: '20 fundamental programming concepts explained simply',
    cards: [
      { front: 'Variable', back: 'A named container that stores a value in a program' },
      { front: 'Function', back: 'A reusable block of code that performs a specific task' },
      { front: 'Loop', back: 'A structure that repeats a block of code until a condition is met' },
      { front: 'Array', back: 'An ordered list of items stored under one variable name' },
      { front: 'Object', back: 'A collection of key-value pairs representing a real-world thing' },
      { front: 'Boolean', back: 'A data type with only two values: true or false' },
      { front: 'String', back: 'A sequence of characters used to represent text' },
      { front: 'Integer', back: 'A whole number with no decimal point' },
      { front: 'Null', back: 'The intentional absence of any value' },
      { front: 'Conditional', back: 'Code that runs only when a certain condition is true (if/else)' },
      { front: 'Bug', back: 'An error in a program that causes it to behave unexpectedly' },
      { front: 'Debugging', back: 'The process of finding and fixing bugs in code' },
      { front: 'API', back: 'A set of rules that lets two programs communicate with each other' },
      { front: 'Class', back: 'A blueprint for creating objects with shared properties and methods' },
      { front: 'Method', back: 'A function that belongs to an object or class' },
      { front: 'Recursion', back: 'When a function calls itself to solve a smaller version of the same problem' },
      { front: 'Library', back: 'Pre-written code you can import and use in your own programs' },
      { front: 'Version Control', back: 'A system for tracking and managing changes to code over time (e.g. Git)' },
      { front: 'Database', back: 'An organized system for storing and retrieving data' },
      { front: 'Compile Error', back: 'An error caught before the program runs, usually caused by a syntax mistake' },
    ],
  },
  {
    id: 'template_capitals',
    name: 'Capitals of Uncommon Countries',
    emoji: '🌍',
    description: '20 capital cities of lesser-known countries',
    cards: [
      { front: 'Bhutan', back: 'Thimphu' },
      { front: 'Mongolia', back: 'Ulaanbaatar' },
      { front: 'Suriname', back: 'Paramaribo' },
      { front: 'Eritrea', back: 'Asmara' },
      { front: 'Djibouti', back: 'Djibouti City' },
      { front: 'Vanuatu', back: 'Port Vila' },
      { front: 'Turkmenistan', back: 'Ashgabat' },
      { front: 'Kyrgyzstan', back: 'Bishkek' },
      { front: 'Tajikistan', back: 'Dushanbe' },
      { front: 'Comoros', back: 'Moroni' },
      { front: 'Kiribati', back: 'South Tarawa' },
      { front: 'Tuvalu', back: 'Funafuti' },
      { front: 'Palau', back: 'Ngerulmud' },
      { front: 'Micronesia', back: 'Palikir' },
      { front: 'San Marino', back: 'San Marino City' },
      { front: 'Liechtenstein', back: 'Vaduz' },
      { front: 'Moldova', back: 'Chișinău' },
      { front: 'Kosovo', back: 'Pristina' },
      { front: 'Timor-Leste', back: 'Dili' },
      { front: 'Andorra', back: 'Andorra la Vella' },
    ],
  },
];

export default function PresetDecksPage({ session }) {
  const [existingNames, setExistingNames] = useState(new Set());
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState(new Set());

  useEffect(() => {
    supabase.from('decks').select('name').then(({ data }) => {
      setExistingNames(new Set((data ?? []).map(d => d.name)));
    });
  }, []);

  async function handleAdd(template) {
    setAdding(template.id);
    const { data: deck } = await supabase
      .from('decks')
      .insert({ name: template.name, user_id: session.user.id })
      .select().single();
    if (deck) {
      await supabase.from('cards').insert(
        template.cards.map(c => ({ deck_id: deck.id, front: c.front, back: c.back }))
      );
      setAdded(prev => new Set([...prev, template.id]));
      setExistingNames(prev => new Set([...prev, template.name]));
    }
    setAdding(null);
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>📦 Preset Decks</h1>
      <p style={s.sub}>Add a ready-made deck to your account instantly.</p>

      <div style={s.list}>
        {TEMPLATE_DECKS.map(template => {
          const alreadyAdded = added.has(template.id) || existingNames.has(template.name);
          const isAdding = adding === template.id;
          return (
            <div key={template.id} style={s.card}>
              <div style={s.cardLeft}>
                <span style={s.emoji}>{template.emoji}</span>
                <div>
                  <p style={s.name}>{template.name}</p>
                  <p style={s.desc}>{template.description}</p>
                </div>
              </div>
              <button
                style={{ ...s.btn, ...(alreadyAdded ? s.btnDone : {}) }}
                onClick={() => !alreadyAdded && handleAdd(template)}
                disabled={alreadyAdded || isAdding}
              >
                {isAdding ? '...' : alreadyAdded ? '✓ Added' : '+ Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 680, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', gap: 16 },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 16, flex: 1 },
  emoji: { fontSize: 36, flexShrink: 0 },
  name: { fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 3 },
  desc: { fontSize: 13, color: '#9CA3AF' },
  btn: { padding: '10px 20px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' },
  btnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },
};
