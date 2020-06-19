/**
 * Setup jsdom so we can run tests of React components that require the DOM API
 */
var jsdom = require('jsdom').jsdom;

global.document = jsdom('');
global.window = global.document.defaultView;
Object.keys(global.document.defaultView).forEach((property) => {
    if (typeof global[property] === 'undefined') {
        global[property] = global.document.defaultView[property];
    }
});

global.navigator = {
    userAgent: 'node.js'
};

// Enzyme configuration:
const enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');
enzyme.configure({ adapter: new Adapter() });
