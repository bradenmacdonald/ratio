import * as React from "react";

interface Props {
    onFileDrop: (files: FileList) => void;
    dropMessage: React.ReactNode;
    /** A single letter keyboard shortcut to trigger the upload for non-mouse users */
    keyShortcut: string;
}
interface State {
    dragEnterCount: number;
}

/**
 * Wraps some DOM elements and provides drag-and-drop uploading of files that then
 * trigger some event.
 *
 * Displays a friendly message when the user drags a file above the child components,
 * then once the user drops the file, this will trigger a custom handler.
 */
export class DropToUploadWrapper extends React.PureComponent<Props, State> {
    private fileUploadElement: HTMLInputElement;

    constructor(props) {
        super(props);
        this.state = {
            dragEnterCount: 0, // How many times has dragEnter been sent? (decreased when dragLeave gets sent)
        };
        // Bind events to this:
        this.handleDragEnter = this.handleDragEnter.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
    }

    /**
     * Handle drag over the target area - used to start an import of transaction data.
     * We need to increment a counter because this event gets fired on enter/exit of child elements too.
     */
    private handleDragEnter(event) {
        const dragEnterCount = this.state.dragEnterCount + 1;
        this.setState({dragEnterCount});
    }
    private handleDragOver(event) {
        // Required in order to accept drop events:
        event.stopPropagation();
        event.preventDefault();
    }

    /** Handle drag exit within the target area */
    private handleDragLeave(event) {
        const dragEnterCount = this.state.dragEnterCount - 1;
        this.setState({dragEnterCount});
    }

    /** True when the user has dragged a file over the target area and may drop it */
    get showDropMessage() {
        return this.state.dragEnterCount > 0;
    }

    /** Handle a file being dropped onto the target area */
    private handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.stopPropagation();
        event.preventDefault();
        this.setState({dragEnterCount: 0});
        if (event.dataTransfer.files.length < 1) {
            return;
        }
        this.props.onFileDrop(event.dataTransfer.files);
    }

    /** Handle a file upload triggered by a key press and the <input type="file"> element. */
    private handleUpload(event) {
        if (event.target.files.length < 1) {
            return;
        }
        this.props.onFileDrop(event.target.files);
    }

    /** Watch for keyboard shortcuts that should trigger the file upload dialog. */
    private handleKeyPress(event: KeyboardEvent) {
        if (
            event.key === this.props.keyShortcut &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            (event.target as HTMLElement).nodeName !== 'INPUT' &&
            (event.target as HTMLElement).nodeName !== 'SELECT'
        ) {
            this.fileUploadElement.click();
        }
    }

    public componentWillMount() {
        document.body.addEventListener('keypress', this.handleKeyPress);
    }
    public componentWillUnmount() {
        document.body.removeEventListener('keypress', this.handleKeyPress);
    }

    public render() {
        return (
            <div onDragEnter={this.handleDragEnter} onDragOver={this.handleDragOver} onDragLeave={this.handleDragLeave} onDrop={this.handleDrop}>

                {/* To support keyboard users (sighted or not), we also allow uploading via a keyboard shortcut. */}
                <input type="file" ref={ref => this.fileUploadElement = ref} className="hiddenFileUpload" onChange={this.handleUpload} />

                {this.props.children}

                {this.showDropMessage ? <div className="drop-to-upload-message">{this.props.dropMessage}</div> : null}

            </div>
        );
    }
}
