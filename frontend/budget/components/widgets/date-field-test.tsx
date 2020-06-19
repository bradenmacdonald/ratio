import {expect} from 'chai';
import {mount} from 'enzyme';
import 'mocha';
import * as React from 'react';
import * as sinon from 'sinon';

import {PDate} from 'prophecy-engine';
import {DateField} from './date-field';

const D = PDate.parseTemplateLiteral;

describe("<DateField />", () => {
    it("renders an <input type=\"date\"> control with CSS class .ifc.ifc-p", () => {
        const component = mount(<DateField />);
        const input = component.find('input');
        expect(input).to.have.length(1);
        expect(input.is('[type="date"]')).to.equal(true);
        expect(input.is('.ifc.ifc-p')).to.equal(true);
    });
    it("accepts a PDate value and sets the input element's value accordingly", () => {
        const component = mount(<DateField dateValue={D`2016-05-30`} />);
        const input = component.find('input').first();
        expect(input.prop("value")).to.equal('2016-05-30');
    });
    it("accepts a null date value and sets the input element's value accordingly", () => {
        const component = mount(<DateField dateValue={null} />);
        const input = component.find('input').first();
        expect(input.prop("value")).to.equal('');
    });
    it("accepts custom HTML attributes", () => {
        const component = mount(<DateField attrs={{id: "testIdValue"}} />);
        const input = component.find('input').first();
        expect(input.prop("id")).to.equal('testIdValue');
    });
    it("accepts a new input value when blurred, and calls onValueChange", () => {
        const handleValueChange = sinon.spy();
        const component = mount(<DateField onValueChange={handleValueChange} />);
        const input = component.find('input').first();
        input.simulate('focus');
        input.getDOMNode().value = '2000-10-20';
        input.simulate('change');
        expect(handleValueChange.calledOnce).to.equal(false);
        input.simulate('blur');
        // Value should be reset after the blur, because we didn't change the props.
        // The value should always be consistent with props unless the user is actively
        // focus on the input element and making a change.
        expect(input.prop("value")).to.equal('');
        expect(handleValueChange.calledOnce).to.equal(true);
        expect(handleValueChange.args[0][0]).to.be.instanceof(PDate);
        expect(handleValueChange.args[0][0].toString()).to.equal("2000-10-20");
    });
    it("accepts a new input value when enter is pressed, and calls onValueChange", () => {
        const handleValueChange = sinon.spy();
        const component = mount(<DateField dateValue={D`2013-12-11`} onValueChange={handleValueChange} />);
        const input = component.find('input').first();
        // Mock a browser DOM element method:
        input.getDOMNode().blur = () => { input.simulate('blur'); };

        input.simulate('focus');
        input.getDOMNode().value = '2000-10-20';
        input.simulate('change');
        expect(handleValueChange.calledOnce).to.equal(false);
        input.simulate('keyDown', {key: 'Enter'});
        expect(input.prop("value")).to.equal('2013-12-11'); // Value is reset
        expect(handleValueChange.calledOnce).to.equal(true);
        expect(handleValueChange.args[0][0]).to.be.instanceof(PDate);
        expect(handleValueChange.args[0][0].toString()).to.equal("2000-10-20");
    });
    it("resets to the original value when escape is pressed, and does not call onValueChange", () => {
        const handleValueChange = sinon.spy();
        const component = mount(<DateField dateValue={D`2013-12-11`} onValueChange={handleValueChange} />);
        const input = component.find('input').first();
        // Mock a browser DOM element method:
        input.blur = () => { input.simulate('blur'); };

        input.simulate('focus');
        input.value = '2000-10-20';
        input.simulate('change', {});
        expect(handleValueChange.calledOnce).to.equal(false);
        input.simulate('keyDown', {key: 'Escape', });
        expect(input.prop("value")).to.equal('2013-12-11'); // Value is reset
        expect(handleValueChange.calledOnce).to.equal(false);
    });
});
