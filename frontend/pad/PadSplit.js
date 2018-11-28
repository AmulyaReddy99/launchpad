/* @flow */

import React, { Component } from 'react';
import type { Pad, User, Context } from '../types';
import PadStorage from '../PadStorage';
import Header from '../Header/Header';

import Footer from './Footer';
import GraphiQLWrapper from './GraphiQLWrapper';
import Editor from './code-editor/Editor';
import Logs from './Logs';

import ContextEditor from '../modal/ContextEditor';
import Dependencies from '../modal/Dependencies';
import Modal from '../modal/Modal';

import './PadSplit.less';
import './Resizer.less';
import SplitPane from 'react-split-pane';
import Helmet from 'react-helmet';

type PadSplitProps = {|
  pad: Pad,
  user: ?User,
  engineClient: any,
  currentCode: string,
  currentContext: Array<Context>,
  isDeploying: boolean,
  error: ?string,
  onDeploy: () => any,
  onReset: () => any,
  onFork: () => any,
  onCodeChange: string => any,
  onContextChange: (Array<Context>) => any,
  onLogin: () => any,
  onLogout: () => any,
  onSetTitle: (title: string) => any,
  onSetDescription: (description: string) => any,
  onSetDefaultQuery: (query: string) => any,
  onDownload: () => any,
|};

type View = 'editor' | 'graphiql' | 'both';
type ModalType = 'dependencies' | 'secrets' | 'onboarding';

const visitedKey = 'visited2';
export default class PadSplit extends Component {
  props: PadSplitProps;
  state: {
    viewing: View,
    isLogOpen: boolean,
    openModal: ?ModalType,
  };

  constructor(props: PadSplitProps) {
    super(props);
    let openModal = null;
    let firstTime = PadStorage.getItem('global', visitedKey);
    if (!firstTime) {
      openModal = 'onboarding';
    }
    let viewing = ((PadStorage.getItem(props.pad.id, 'view'): any): ?View);
    if (!viewing) {
      if (window.innerWidth >= 1280) {
        viewing = 'both';
      } else {
        viewing = 'editor';
      }
    }
    this.state = {
      viewing: viewing,
      isLogOpen: false,
      openModal,
    };
  }

  componentDidMount() {
    if (this.hasEmptyContext()) {
      this.showEmptyContext();
    }
  }

  handleChangeViewing = (view: View) => {
    this.setState({
      viewing: view,
    });
    PadStorage.setItem(this.props.pad.id, 'view', view);
  };

  handleResetLinkClick = (evt: Event) => {
    evt.preventDefault();
    this.props.onReset();
  };

  handleLogOpen = () => {
    this.setState({
      isLogOpen: true,
    });
  };

  handleLogClose = () => {
    this.setState({
      isLogOpen: false,
    });
  };

  handleModalOpen = (type: ModalType) => {
    this.setState({
      openModal: type,
    });
  };

  handleModalClose = () => {
    this.setState({
      openModal: null,
    });
  };

  handleOnboardingModalClose = () => {
    PadStorage.setItem('global', visitedKey, 'true');
    this.handleModalClose();
  };

  handleDeploy = () => {
    if (this.hasEmptyContext()) {
      this.showEmptyContext();
    } else {
      this.props.onDeploy();
    }
  };

  handleFork = () => {
    if (this.hasEmptyContext()) {
      this.showEmptyContext();
    } else {
      this.props.onFork();
    }
  };

  hasEmptyContext() {
    return this.props.currentContext.some(
      ({ value }) => value != null && value === '',
    );
  }

  showEmptyContext() {
    this.setState({
      openModal: 'secrets',
    });
  }

  renderModals() {
    const goExtendLink = (
      <a
        href="https://goextend.io/blog/we-are-sunsetting-extend"
        target="_blank"
        rel="noopener noreferrer"
      >
        discontinuing their service
      </a>
    );

    const codeSandboxLink = (
      <a
        href="https://codesandbox.io/s/apollo-server"
        target="_blank"
        rel="noopener noreferrer"
      >
        <strong>CodeSandbox</strong>
      </a>
    );

    const glitchLink = (
      <a
        href="https://glitch.com/~apollo-launchpad"
        target="_blank"
        rel="noopener noreferrer"
      >
        <strong>Glitch</strong>
      </a>
    );

    const twitterLink = (
      <a
        href="https://twitter.com/apollographql"
        target="_blank"
        rel="noopener noreferrer"
      >
        Twitter
      </a>
    );

    const slackLink = (
      <a
        href="https://www.apollographql.com/slack/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Slack
      </a>
    );

    return [
      <Modal
        key="welcome"
        isOpen={this.state.openModal === 'onboarding'}
        onRequestClose={this.handleOnboardingModalClose}
        shouldCloseOnOverlayClick={false}
        title="Thanks for using Launchpad!"
      >
        <p>
          We will be sunsetting Launchpad on <strong>December 15, 2018</strong>{' '}
          now that our hosting platform, Auth0 Extend, is {goExtendLink}. We
          decided to not invest time into moving to another service because more
          full-featured Apollo Server playgrounds currently exist. Please
          migrate all examples to either {codeSandboxLink} or {glitchLink}{' '}
          before <strong>December 15, 2018</strong> so you don't lose your work.
        </p>

        <p>
          Thanks for your support and all of your creative examples over the
          years! We can't wait to see what you build on {codeSandboxLink} and{' '}
          {glitchLink}. If you have any questions, please reach out to the
          Apollo team on {twitterLink} or {slackLink}.
        </p>

        <div className="welcome-modal-start-wrapper">
          <button
            className="welcome-modal-start btn primary"
            onClick={this.handleOnboardingModalClose}
          >
            Migrate my Launchpads
          </button>
        </div>
      </Modal>,
      <Modal
        key="secrets"
        isOpen={this.state.openModal === 'secrets'}
        onRequestClose={this.handleModalClose}
        title="Edit Server Secrets"
      >
        <ContextEditor
          context={this.props.currentContext}
          onChange={this.props.onContextChange}
        />
      </Modal>,
      <Modal
        key="dependencies"
        isOpen={this.state.openModal === 'dependencies'}
        onRequestClose={this.handleModalClose}
        title="npm Dependencies"
      >
        <Dependencies dependencies={this.props.pad.dependencies} />
      </Modal>,
    ];
  }

  renderLogs() {
    if (this.state.isLogOpen && this.props.pad.token) {
      return (
        <Logs token={this.props.pad.token} onClose={this.handleLogClose} />
      );
    } else {
      return null;
    }
  }

  renderEditors() {
    const canEdit = Boolean(
      !this.props.pad.user ||
        (this.props.user && this.props.pad.user.id === this.props.user.id),
    );

    return (
      <div className="PadSplit-Editors">
        <SplitPane defaultSize="50%">
          <div className="PadSplit-Left">
            <div className="PadSplit-EditorWrapper">
              <Editor
                code={this.props.currentCode}
                canEdit={canEdit}
                onChange={this.props.onCodeChange}
              />
            </div>
            {canEdit ? null : (
              <div className="editor-fork-banner">
                Log in and fork this pad in order to edit it.
              </div>
            )}
            <div className="PadSplit-Logs">{this.renderLogs()}</div>
          </div>
          <div className="PadSplit-Right">
            <GraphiQLWrapper
              pad={this.props.pad}
              user={this.props.user}
              isDeploying={this.props.isDeploying}
              onSetDefaultQuery={this.props.onSetDefaultQuery}
            />
          </div>
        </SplitPane>
      </div>
    );
  }

  renderHelmet() {
    return (
      <Helmet>
        <title>{this.props.pad.title || 'Apollo Launchpad'}</title>
      </Helmet>
    );
  }

  render() {
    return (
      <div className="PadSplit">
        <Header
          pad={this.props.pad}
          user={this.props.user}
          engineClient={this.props.engineClient}
          isDeploying={this.props.isDeploying}
          onDeploy={this.handleDeploy}
          onReset={this.props.onReset}
          onFork={this.handleFork}
          onDownload={this.props.onDownload}
          onLogin={this.props.onLogin}
          onLogout={this.props.onLogout}
          onSetTitle={this.props.onSetTitle}
          onSetDescription={this.props.onSetDescription}
          currentContext={this.props.currentContext}
          onContextChange={this.props.onContextChange}
        />

        <div className="PadSplit-Main">{this.renderEditors()}</div>

        <Footer
          isDraft={this.props.pad.isDraft}
          isDeployed={this.props.pad.isDeployed}
          canSeeLogs={Boolean(this.props.pad.token)}
          url={this.props.pad.url}
          error={this.props.error}
          onResetLinkClick={this.handleResetLinkClick}
          isLogOpen={this.state.isLogOpen}
          onLogOpen={this.handleLogOpen}
          onLogClose={this.handleLogClose}
          onModalOpen={this.handleModalOpen}
        />
        {this.renderModals()}
      </div>
    );
  }
}
