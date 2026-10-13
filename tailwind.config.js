module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', '!./src/vendor/**', './safelist.txt'],

    darkMode: 'class',
    theme: {
        screens: {
            xs: '482px',
            sm: '640px',

            md: '768px',

            lg: '1024px',

            xl: '1280px',

            '2xl': '1536px',
        },
        flex: {
            1: '1',
        },

        extend: {
            backgroundColor: {
                light: '#fff',
                'accent-light': '#e5e7e0',
                dark: '#1e1f23',
                'accent-dark': '#232429',
                primary: 'rgb(var(--bg) / <alpha-value>)',
                accent: 'rgb(var(--accent) / <alpha-value>)',
                input: 'rgb(var(--input-bg) / <alpha-value>)',
                'input-hover': 'rgb(var(--input-bg-hover) / <alpha-value>)',
            },
            backgroundImage: {
                'bullet-chevron-light':
                    'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24"><path fill="%23555" fill-rule="evenodd" d="M8.47 3.47a.75.75 0 0 1 1.06 0l7.293 7.292a1.75 1.75 0 0 1 0 2.475L9.53 20.53a.75.75 0 0 1-1.06-1.06l7.293-7.293a.25.25 0 0 0 0-.354L8.47 4.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>\')',

                'bullet-chevron-dark':
                    'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24"><path fill="%23999" fill-rule="evenodd" d="M8.47 3.47a.75.75 0 0 1 1.06 0l7.293 7.292a1.75 1.75 0 0 1 0 2.475L9.53 20.53a.75.75 0 0 1-1.06-1.06l7.293-7.293a.25.25 0 0 0 0-.354L8.47 4.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>\')',

                'arrow-up-right':
                    'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24"><path fill="%232F80FA" fill-rule="evenodd" d="M7.995 5.75a.75.75 0 0 1 .75-.75h8.505c.966 0 1.75.784 1.75 1.75v9.496a.75.75 0 0 1-1.5 0V7.56L7.03 18.03a.75.75 0 0 1-1.06-1.061L16.44 6.5H8.744a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>\')',
            },

            borderColor: {
                light: '#fff',
                'accent-light': '#e5e7e0',
                dark: '#1e1f23',
                'accent-dark': '#232429',
                button: '#B17816',
                'button-dark': '#835C19',
                'button-secondary-dark': '#C78617',
                accent: 'rgb(var(--accent) / <alpha-value>)',

                primary: 'rgb(var(--border) / <alpha-value>)',
                secondary: 'rgb(var(--input-border) / <alpha-value>)',
                'bg-primary': 'rgb(var(--bg) / <alpha-value>)',
                input: 'rgb(var(--input-border) / <alpha-value>)',
                'input-hover': 'rgb(var(--input-border-hover) / <alpha-value>)',
            },
            borderRadius: {
                xs: '2px',
                sm: '4px',
                lg: '20px',
            },
            borderWidth: {
                3: '3px',
            },
            colors: {
                'light-1': '#FDFDF8',
                'light-2': '#EEEFE9',
                'light-3': '#E5E7E0',
                'light-4': '#D2D3CC',
                'light-5': '#C8CAC1',
                'light-6': '#BFC1B7',
                'light-7': '#B6B7AF',
                'light-8': '#D0D1C9',
                'light-9': '#73756B',
                'light-10': '#9EA096',
                'light-11': '#4D4F46',
                'light-12': '#23251D',

                transparent: 'transparent',
                current: 'currentColor',

                highlight: 'rgba(235,157,42,.2)',
                footer: '#08042f',

                black: '#000',
                blue: '#2F80FA',
                'blue-2': '#589DF8',
                'blue-2-dark': '#1E2F46',
                brown: '#3B2B26',
                'brown-dark': '#C4A484',
                'burnt-orange': '#DF6133',
                'burnt-orange-dark': '#8E2600',
                orange: '#EB9D2A',
                'orange-dark': '#C77800',
                creamsicle: '#FFD699',
                'creamsicle-dark': '#E38907',
                fuchsia: '#A621C8',
                'fuchsia-dark': '#74108D',
                gray: '#8F8F8C',
                green: '#6AA84F',
                'green-dark': '#4D7533',
                'green-2': '#36C46F',
                gold: '#FFBA53',
                'gold-dark': '#E38907',
                lilac: '#8567FF',
                'light-blue': '#9FC4FF',
                'light-blue-dark': '#1E2F46',
                'light-purple': '#E2D6FF',
                'light-purple-dark': '#78689D',
                'light-yellow': '#FFCE5C',
                'light-yellow-dark': '#C7982B',
                'lime-green': '#96E5B6',
                navy: '#1E2F46',
                'navy-dark': '#0F233D',
                pink: '#E34C6F',
                'pink-dark': '#8C0D3B',
                'pale-blue': '#D2E6FF',
                'pale-blue-dark': '#648DC2',
                purple: '#B62AD9',
                'purple-2': '#40396E',
                'purple-2-dark': '#3C3154',
                red: '#F54E00',
                'red-2': '#F87A4C',
                'red-2-dark': '#C03300',
                salmon: '#F35454',
                seagreen: '#30ABC6',
                'sky-blue': '#2EA2D3',
                tan: '#EEEFE9',
                teal: '#29DBBB',
                'teal-2': '#6BC0B3',
                'teal-2-dark': '#34796F',
                white: '#fff',
                'white-dark': '#111',
                yellow: '#F7A501',

                'button-shadow': '#CD8407',
                'button-border': '#B17816',
                'button-shadow-dark': '#99660E',
                'button-secondary-shadow-dark': '#925D05',

                border: 'rgb(var(--border) / <alpha-value>)',
                primary: 'rgb(var(--bg) / <alpha-value>)',

                light: '#fff',
                'accent-light': '#e5e7e0',
                dark: '#1e1f23',
                'accent-dark': '#232429',
            },
            textColor: {
                primary: 'rgb(var(--text-primary) / <alpha-value>)',
                secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                muted: 'rgb(var(--text-muted) / <alpha-value>)',
            },
            fill: {
                primary: 'rgb(var(--text-primary) / <alpha-value>)',
                secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                muted: 'rgb(var(--text-muted) / <alpha-value>)',
                accent: 'rgb(var(--accent) / <alpha-value>)',
            },
            stroke: {
                primary: 'rgb(var(--text-primary) / <alpha-value>)',
                secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                muted: 'rgb(var(--text-muted) / <alpha-value>)',
                accent: 'rgb(var(--accent) / <alpha-value>)',
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'avenir next',
                    'avenir',
                    'segoe ui',
                    'helvetica neue',
                    'helvetica',
                    'Ubuntu',
                    'roboto',
                    'noto',
                    'arial',
                    'sans-serif',
                ],

                code: ['Source Code Pro', 'Menlo', 'Consolas', 'monaco', 'monospace'],
            },

            keyframes: {
                slideDown: {
                    from: { gridTemplateRows: '0fr' },
                    to: { gridTemplateRows: '1fr' },
                },
                slideUp: {
                    from: { gridTemplateRows: '1fr' },
                    to: { gridTemplateRows: '0fr' },
                },

                slideIn: {
                    from: {
                        transform: 'translateX(calc(100% + var(--viewport-padding)))',
                    },
                    to: { transform: 'translateX(0)' },
                },
                swipeOut: {
                    from: { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
                    to: { transform: 'translateX(calc(100% + var(--viewport-padding)))' },
                },
            },
            animation: {
                slideDown: 'slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)',
                slideUp: 'slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)',

                slideIn: 'slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                swipeOut: 'swipeOut 100ms ease-out',
            },

            typography: {
                DEFAULT: {
                    css: {
                        '--tw-prose-bullets': 'rgb(var(--text-secondary))',
                        '--tw-prose-counters': 'rgb(var(--text-secondary))',
                    },
                },
                invert: {
                    css: {
                        '--tw-prose-invert-bullets': 'rgb(var(--text-secondary))',
                        '--tw-prose-invert-counters': 'rgb(var(--text-secondary))',
                    },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
        function ({ addUtilities }) {
            addUtilities({
                '.container-size': { 'container-type': 'size' },
                '.text-shadow-desktop': {
                    'text-shadow': '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 0, 0, 0.3)',
                },
            })
        },
        require('@tailwindcss/typography'),
        function ({ addVariant }) {
            // Site toggle (data attr, set early in theme-init) + OS prefers-reduced-transparency
            addVariant('reduce-transparency', [
                'body[data-reduce-transparency="true"] &',
                '@media (prefers-reduced-transparency: reduce)',
            ])
        },
    ],
}
