import {expect} from 'chai';
import {mount} from 'enzyme';
import 'mocha';
import * as React from 'react';

import {ButtonWithPopup} from './button-with-popup';

describe("<ButtonWithPopup />", () => {

    const button1 = (<ButtonWithPopup toggleButton={
        <button className="ifc ifc-small menu-opener">Custom <span className="sr">Button</span></button>
    }>
        <li><button className="ifc">Action 1</button></li>
        <li><button className="ifc">Action 2</button></li>
    </ButtonWithPopup>);

    it("renders a custom button control with an an empty list", () => {
        const component = mount(button1);
        const openerButton = component.find('button.menu-opener');
        expect(openerButton).to.have.length(1);
        const ul = component.find('ul');
        expect(ul).to.have.length(1);
        expect(ul.children()).to.have.length(0);
        expect(ul.is('.menu-popup')).to.be.true;
        expect(ul.is('.menu-popup-closed')).to.be.true;
    });

    it("displays the list when the custom button is clicked", () => {
        const component = mount(button1);
        const openerButton = component.find('button.menu-opener').first();
        openerButton.simulate('click');
        const ul = component.find('ul');
        expect(ul).to.have.length(1);
        expect(ul.children()).to.have.length(2);
        expect(ul.is('.menu-popup')).to.be.true;
        expect(ul.is('.menu-popup-closed')).to.be.false;
    });

    it("hides the list when the custom button is clicked again", () => {
        const component = mount(button1);
        const openerButton = component.find('button.menu-opener').first();
        openerButton.simulate('click');
        let ul = component.find('ul');
        expect(ul.children()).to.have.length(2);
        expect(ul.is('.menu-popup-closed')).to.be.false;
        openerButton.simulate('click');
        ul = component.find('ul');
        expect(ul.children()).to.have.length(0);
        expect(ul.is('.menu-popup-closed')).to.be.true;
    });

    it("hides the list when the user clicks elsewhere on the page", () => {
        const component = mount(button1);
        const openerButton = component.find('button.menu-opener').first();
        openerButton.simulate('click');
        let ul = component.find('ul');
        expect(ul.children()).to.have.length(2);
        expect(ul.is('.menu-popup-closed')).to.be.false;
        document.body.click();
        component.update();
        ul = component.find('ul');
        expect(ul.children()).to.have.length(0);
        expect(ul.is('.menu-popup-closed')).to.be.true;
    });
});
