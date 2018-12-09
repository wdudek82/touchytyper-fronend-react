import React, { Component } from 'react';
import _ from 'lodash-uuid';
import ProgressBar from '../Layout/ProgressBar/ProgressBar';
import './TypingExercise.css';
import CharacterSpan from '../CharacterSpan/CharacterSpan';
import MasterInput from '../Layout/MasterInput/MasterInput';

class TypingExercise extends Component {
  constructor(props) {
    super(props);
    this.state = {
      originalText: props.text,
      typedText: '',
      cachedCharSpans: this.createInitialCharSpans(this.props.text),
      cachedHtml: [],
      mistakesIndexes: [],
      tokensData: this.getTokensData(this.props.text),
      keysPressed: [],
    };
  }

  componentDidMount() {
    const initialHtml = this.createInitialTokenSpans();

    this.setState(() => ({
      cachedHtml: initialHtml,
    }));
  }

  createInitialCharSpans = (text) => {
    return text.split('').map((char, index) => (
      <CharacterSpan key={_.uuid()} classes={index === 0 && 'caret'}>
        {char}
      </CharacterSpan>
    ));
  };

  createInitialTokenSpans = () => {
    const { cachedCharSpans } = this.state;
    let totalLength = 0;

    return this.state.tokensData.tokens.map((token, index) => {
      const start = totalLength || index;
      const end = totalLength + token.length;
      totalLength += token.length;
      return (
        <span
          key={_.uuid()}
          className={`token ${index === 0 ? 'current' : ''}`}
        >
          {cachedCharSpans.slice(start, end)}
        </span>
      );
    });
  };

  wrapInTokenSpan = (start, tokenLength, isCurrent) => {
    return (
      <span key={_.uuid()} className={`token ${isCurrent ? 'current' : ''}`}>
        {this.state.cachedCharSpans.slice(start, start + tokenLength)}
      </span>
    );
  };

  getTokensData = (text) => {
    const pattern = /\W*\w+[\s\W]*/g;
    const tokens = text.match(pattern);

    const tokenIndexes = [0];
    let sum = tokens[0].length;
    for (let i = 1; i < tokens.length; i += 1) {
      tokenIndexes.push(sum);
      sum += tokens[i].length;
    }

    return { tokens, tokenIndexes };
  };

  findUpdatedTokenTokenIndexCharIndex = (index) => {
    const {
      tokensData: { tokens },
    } = this.state;

    let tokenPosition;
    let updatedToken;
    let updatedCharPositionInToken;
    let sum = 0;
    for (let i = 0; i < tokens.length; i += 1) {
      sum += tokens[i].length;
      if (index <= sum - 1) {
        tokenPosition = i;
        updatedToken = tokens[i];
        updatedCharPositionInToken =
          sum > tokens[0].length ? tokens[i].length - (sum - index) : index;
        break;
      }
    }

    return {
      updatedCharPositionInToken,
      updatedTokenData: {
        updatedToken,
        tokenPosition,
      },
    };
  };

  updateCachedCharSpans = (index, updatedCharSpan, forward = true) => {
    const {
      updatedCharPositionInToken,
      updatedTokenData: { updatedToken, tokenPosition },
    } = this.findUpdatedTokenTokenIndexCharIndex(index);

    const updatedCachedCharSpans = this.state.cachedCharSpans;
    updatedCachedCharSpans[index] = updatedCharSpan;

    // Add caret
    const caretOffset = forward ? 1 : 0;
    updatedCachedCharSpans[index + caretOffset] = this.createNewCharSpan(
      this.state.originalText[index + caretOffset],
      'caret',
    );

    // Remove caret if typing direction is not forward
    if (!forward) {
      updatedCachedCharSpans[index + 1] = this.createNewCharSpan(
        this.state.originalText[index + 1],
      );
    }
    // ...and if from the first char of a token if backspace was pressed
    if (!forward && updatedCharPositionInToken === 0) {
      updatedCachedCharSpans[index - 1] = this.createNewCharSpan(
        this.state.originalText[index - 1],
      );
    }

    this.setState(() => ({ cachedCharSpans: updatedCachedCharSpans }));

    // check if char span with caret is at the last char of a token
    // forward: add caret to the first char of a next token
    // !forward: remove caret from first char of a next token
    if (updatedCharPositionInToken >= updatedToken.length - 1) {
      const nextToken = this.state.tokensData.tokens[tokenPosition + 1];

      // forward: remove "current" class from previous token
      // !forward: remove "current" class from next token
      this.updateCachedHtml(nextToken, tokenPosition + true, forward);

      this.updateCachedHtml(updatedToken, tokenPosition, !forward);
    } else {
      this.updateCachedHtml(updatedToken, tokenPosition, true);
    }
  };

  updateCachedHtml = (updatedToken, tokenPosition, isCurrentToken) => {
    const tokenStartingIndex = this.state.tokensData.tokenIndexes[
      tokenPosition
    ];

    const newToken = this.wrapInTokenSpan(
      tokenStartingIndex,
      updatedToken.length,
      isCurrentToken,
    );
    const updatedCachedHtml = this.state.cachedHtml;

    updatedCachedHtml[tokenPosition] = newToken;

    this.setState(() => ({ cachedHtml: updatedCachedHtml }));
  };

  createNewCharSpan = (char, classList = []) => (
    <CharacterSpan key={_.uuid()} classes={classList}>
      {char}
    </CharacterSpan>
  );

  handleCharacterDiff = (text, forward) => {
    const { originalText } = this.state;
    const index = text.length - 1;

    let updatedCharSpan;
    if (forward) {
      if (text[index] === originalText[index]) {
        const wasMistake = this.state.mistakesIndexes[index];
        updatedCharSpan = this.createNewCharSpan(
          originalText[index],
          wasMistake ? 'fixed' : 'correct',
        );
      } else {
        updatedCharSpan = this.createNewCharSpan(
          originalText[index],
          'incorrect',
        );
        this.saveMistakeIndex(index);
      }
      this.updateCachedCharSpans(index, updatedCharSpan);
    } else {
      // If player uses backspace, remove all styling besides "char" class
      // from char that was on a position affected by backspace
      updatedCharSpan = this.createNewCharSpan(originalText[index + 1]);
      this.updateCachedCharSpans(index + 1, updatedCharSpan, forward);
    }
  };

  saveMistakeIndex = (index) => {
    const updatedMistakesIndexes = this.state.mistakesIndexes;
    updatedMistakesIndexes[index] = 1;

    this.setState(() => ({
      mistakesIndexes: updatedMistakesIndexes,
    }));
  };

  handleChange = (e) => {
    const { value } = e.target;

    this.setState(() => ({
      typedText: value,
    }));

    this.handleCharacterDiff(value, this.state.typedText.length < value.length);
  };

  handleKeyUp = (e) => {};

  render() {
    return (
      <div>
        <MasterInput
          keyUp={this.handleKeyUp}
          change={this.handleChange}
          value={this.state.typedText}
        />

        <ProgressBar
          originalText={this.state.originalText}
          typedText={this.state.typedText}
        />

        <div className="text-container">{this.state.cachedHtml}</div>
      </div>
    );
  }
}

export default TypingExercise;
