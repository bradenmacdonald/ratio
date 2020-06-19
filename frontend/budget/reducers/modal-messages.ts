import {Immutable, PRecord} from 'prophecy-engine';

import * as actions from '../actions';
import {MessageType, ModalMessage} from '../modal-message';


/**
 * State that maintains the list of messages to display.
 */
export class ModalMessagesState extends PRecord({ // TODO: change to plain Immutable.Record w/ Immutable.js 4+
    /** List of messages to be displayed - if the list is not empty, the first one in the list should be visible */
    messageList: Immutable.List<ModalMessage>(),
}) {
    /** Get the message that should currently be displayed, if any - if not, returns undefined. */
    get currentMessage(): ModalMessage {
        return this.messageList.first();
    }
}


/**
 * Reducer that maintains the list of messages to display.
 */
export function reducer(state = new ModalMessagesState(), action) {
    switch (action.type) {
    case actions.DISPLAY_MESSAGE: {
        const params: {message: string, type?: MessageType, buttonText?: string} = {message: action.message};
        if (action.messageType) {
            params.type = action.messageType;
        }
        if (action.messageButtonText) {
            params.buttonText = action.messageButtonText;
        }
        return state.set('messageList', state.messageList.push(new ModalMessage(params)));
    }
    case actions.DISMISS_MESSAGE: {
        return state.set('messageList', state.messageList.shift());
    }
    default:
        return state;
    }
}
