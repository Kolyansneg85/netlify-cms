import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled, { css, cx } from 'react-emotion';
import moment from 'moment';
import { capitalize } from 'lodash'
import { colors, colorsRaw, lengths } from 'netlify-cms-ui-default';
import { status } from 'Constants/publishModes';
import { DragSource, DropTarget, HTML5DragDrop } from 'UI'
import WorkflowCard from './WorkflowCard';

const WorkflowListContainer = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: 33.3% 33.3% 33.3%;
`

const styles = {
  column: css`
    margin: 0 20px;
    transition: background-color .5s ease;
    border: 2px dashed transparent;
    border-radius: 4px;
    position: relative;

    &:first-child {
      margin-left: 0;
    }

    &:last-child {
      margin-right: 0;
    }

    &:not(:first-child):not(:last-child) {
      &:before,
      &:after {
        content: '';
        display: block;
        position: absolute;
        width: 2px;
        height: 80%;
        top: 76px;
        background-color: ${colors.textFieldBorder}
      }

      &:before {
        left: -23px;
      }

      &:after {
        right: -23px;
      }
    }
  `,
  columnHovered: css`
    border-color: ${colors.active};
  `,
};

const ColumnHeader = styled.h2`
  font-size: 20px;
  font-weight: normal;
  padding: 4px 14px;
  border-radius: ${lengths.borderRadius};
  margin-bottom: 28px;

  ${props => props.name === 'draft' && css`
    background-color: ${colors.statusDraftBackground};
    color: ${colors.statusDraftText};
  `}

  ${props => props.name === 'pending_review' && css`
    background-color: ${colors.statusReviewBackground};
    color: ${colors.statusReviewText};
  `}

  ${props => props.name === 'pending_publish' && css`
    background-color: ${colors.statusReadyBackground};
    color: ${colors.statusReadyText};
  `}
`

const ColumnCount = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text};
  text-transform: uppercase;
  margin-bottom: 6px;
`

// This is a namespace so that we can only drop these elements on a DropTarget with the same
const DNDNamespace = 'cms-workflow';

const getColumnHeaderText = columnName => {
  switch (columnName) {
    case 'draft': return 'Drafts';
    case 'pending_review': return 'In Review';
    case 'pending_publish': return 'Ready';
  }
}

class WorkflowList extends React.Component {
  static propTypes = {
    entries: ImmutablePropTypes.orderedMap,
    handleChangeStatus: PropTypes.func.isRequired,
    handlePublish: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
  };

  handleChangeStatus = (newStatus, dragProps) => {
    const slug = dragProps.slug;
    const collection = dragProps.collection;
    const oldStatus = dragProps.ownStatus;
    this.props.handleChangeStatus(collection, slug, oldStatus, newStatus);
  };

  requestDelete = (collection, slug, ownStatus) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      this.props.handleDelete(collection, slug, ownStatus);
    }
  };

  requestPublish = (collection, slug, ownStatus) => {
    if (ownStatus !== status.last()) {
      window.alert(
`Only items with a "Ready" status can be published.

Please drag the card to the "Ready" column to enable publishing.`
      );
      return;
    } else if (!window.confirm('Are you sure you want to publish this entry?')) {
      return;
    }
    this.props.handlePublish(collection, slug);
  };

  renderColumns = (entries, column) => {
    if (!entries) return null;

    if (!column) {
      return entries.entrySeq().map(([currColumn, currEntries]) => (
        <DropTarget
          namespace={DNDNamespace}
          key={currColumn}
          onDrop={this.handleChangeStatus.bind(this, currColumn)}
        >
          {(connect, { isHovered }) => connect(
            <div className={cx(styles.column, { [styles.columnHovered]: isHovered })}>
              <ColumnHeader name={currColumn}>{getColumnHeaderText(currColumn)}</ColumnHeader>
              <ColumnCount>
                {currEntries.size} {currEntries.size === 1 ? 'entry' : 'entries'}
              </ColumnCount>
              {this.renderColumns(currEntries, currColumn)}
            </div>
          )}
        </DropTarget>
      ));
    }
    return (
      <div>
        {
          entries.map((entry) => {
            // Look for an "author" field. Fallback to username on backend implementation;
            const author = entry.getIn(['data', 'author'], entry.getIn(['metaData', 'user']));
            const timestamp = moment(entry.getIn(['metaData', 'timeStamp'])).format('MMMM D');
            const editLink = `collections/${ entry.getIn(['metaData', 'collection']) }/entries/${ entry.get('slug') }`;
            const slug = entry.get('slug');
            const ownStatus = entry.getIn(['metaData', 'status']);
            const collection = entry.getIn(['metaData', 'collection']);
            const isModification = entry.get('isModification');
            const canPublish = ownStatus === status.last() && !entry.get('isPersisting', false);
            return (
              <DragSource
                namespace={DNDNamespace}
                key={slug}
                slug={slug}
                collection={collection}
                ownStatus={ownStatus}
              >
              {connect => connect(
                <div>
                  <WorkflowCard
                    collectionName={collection}
                    title={entry.getIn(['data', 'title'])}
                    author={author}
                    authorLastChange={entry.getIn(['metaData', 'user'])}
                    body={entry.getIn(['data', 'body'])}
                    isModification={isModification}
                    editLink={editLink}
                    timestamp={timestamp}
                    onDelete={this.requestDelete.bind(this, collection, slug, ownStatus)}
                    canPublish={canPublish}
                    onPublish={this.requestPublish.bind(this, collection, slug, ownStatus)}
                  />
                </div>
              )}
              </DragSource>
            );
          })
        }
      </div>
    );
  };

  render() {
    const columns = this.renderColumns(this.props.entries);
    return (
      <WorkflowListContainer>{columns}</WorkflowListContainer>
    );
  }
}

export default HTML5DragDrop(WorkflowList); // eslint-disable-line
