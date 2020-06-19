import * as React from 'react';

let lastUsedPopupId = 0;

export interface Props {
    toggleButton: React.ReactElement<any>;
    children: React.ReactChild | React.ReactChild[];
}

export interface State {
    isExpanded: boolean;
}

/**
 * Widget that has a button and a toggleable popup menu
 *
 */
export class ButtonWithPopup extends React.PureComponent<Props, State> {

    private rootElement: HTMLElement;
    private toggleButtonElement: HTMLElement;
    private popupElement: HTMLElement;
    private popupId: string;

    constructor(props) {
        super(props);
        // Bind event handlers:
        this.showPopup = this.showPopup.bind(this);
        this.hidePopup = this.hidePopup.bind(this);
        this.handleClickAnywhere = this.handleClickAnywhere.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        // State:
        this.state = {
            isExpanded: false,
        };
    }
    public componentWillMount() {
        this.popupId = 'btn-menu-popup-' + (++lastUsedPopupId);
    }

    private showPopup() {
        this.setState({isExpanded: true});
    }

    private hidePopup() {
        this.setState({isExpanded: false});
    }

    /** Handle a click anywhere on the document, while the popup is open. */
    private handleClickAnywhere(event) {
        if (!this.rootElement.contains(event.target)) {
            this.hidePopup();
        }
        // Else it will get hidden anyways, and if we try to hide it now, it would
        // get shown again by the time the toggle button's own event handler fires.
    }

    /** Handle a key press, while the popup is open. */
    private handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.hidePopup();
        }
    }

    public render() {
        const button = React.cloneElement(this.props.toggleButton, {
            onClick: this.state.isExpanded ? this.hidePopup : this.showPopup,
            ref: (el: HTMLElement) => { this.toggleButtonElement = el; },
            "aria-haspopup": true,
            "aria-controls": this.popupId,
            "aria-expanded": this.state.isExpanded,
        });
        return (
            <div className="menu-popup-root" onKeyDown={this.state.isExpanded ? this.handleKeyDown : undefined} ref={el => { this.rootElement = el; }}>
                {button}
                <ul className={'menu-popup ' + (this.state.isExpanded ? '' : 'menu-popup-closed')} id={this.popupId} role="group" ref={el => { this.popupElement = el; }} onClick={this.hidePopup}>
                    {this.state.isExpanded ? this.props.children : null}
                </ul>
            </div>
        );
    }

    public componentDidUpdate(prevProps, prevState) {
        if (this.state.isExpanded && !prevState.isExpanded) {
            // The popup has just opened - make sure it it positioned reasonably.
            // By how many pixels are we off the screen on the right hand side? (Negative if we're not)
            // The '5' is just to add a bit of space so we're not hugging the right-hand side of the screen
            const overshootRight = this.popupElement.getBoundingClientRect().left + this.popupElement.offsetWidth - document.documentElement.clientWidth + 5;
            if (overshootRight > 0) {
                this.popupElement.style.left = `-${overshootRight}px`;
            }
            const overshootBottom = this.popupElement.getBoundingClientRect().top + this.popupElement.offsetHeight - document.documentElement.clientHeight + 5;
            if (overshootBottom > 0) {
                this.popupElement.style.top = `-${overshootBottom}px`;
            }
            document.body.addEventListener('click', this.handleClickAnywhere);
        } else if (!this.state.isExpanded && prevState.isExpanded) {
            document.body.removeEventListener('click', this.handleClickAnywhere);
        }
    }

    public componentWillUnmount() {
        document.body.removeEventListener('click', this.handleClickAnywhere);
    }
}
