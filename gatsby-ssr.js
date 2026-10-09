const React = require('react')

import Wrapper from './src/components/Wrapper'
import { Provider } from './src/context/App'
import { Provider as ToastProvider } from './src/context/Toast'

export const wrapRootElement = ({ element }) => <ToastProvider>{element}</ToastProvider>

export const wrapPageElement = ({ element, props: { location } }) => {
    return (
        <Provider element={element} location={location}>
            <Wrapper />
        </Provider>
    )
}

export const onRenderBody = function ({ setPreBodyComponents }) {
    setPreBodyComponents([
        React.createElement('script', {
            key: 'dark-mode',
            src: '/scripts/theme-init.js',
        }),
    ])
}
