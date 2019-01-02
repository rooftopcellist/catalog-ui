import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import propTypes from 'prop-types';
import { Main, PageHeader, PageHeaderTitle } from '@red-hat-insights/insights-frontend-components';
import { addNotification } from '@red-hat-insights/insights-frontend-components/components/Notifications';
import { addPortfolio, fetchPortfolios } from '../../redux/Actions/PortfolioActions';
import FormRenderer from './FormRenderer';

const schema = {
  type: 'object',
  properties: {
    name: { title: 'New Portfolio Name', type: 'string' },
    description: { title: 'Description', type: 'string' }
  },
  required: [ 'name', 'description' ]
};

class AddPortfolioModal extends Component {
  onSubmit = data => {
    let items = null;
    if (this.props.itemdata) {
      items = [ this.props.itemdata ];
    }

    this.props.addPortfolio(data, items);
    this.props.closeModal();
  }

  onCancel = () => {
    this.props.addNotification({
      variant: 'warning',
      title: 'Adding portfolio',
      description: 'Adding portfolio was cancelled by the user.'
    });
    this.props.closeModal();
  }

  render() {
    let title = 'Create Portfolio';

    if (this.props.itemdata && this.props.itemdata.length > 1) {
      title += ' and Add Selected Products';
    }

    return (
      <Main title={ 'Add Portfolio' }>
        <div className="pf-l-stack">
          <div className="pf-l-stack__item pf-m-secondary ">
            <PageHeader>
              <PageHeaderTitle title= { title } />
            </PageHeader>
          </div>
          { /** why not use pf4 component? */ }
          <div className="pf-l-stack">
            <FormRenderer
              schema={ schema }
              onSubmit={ this.onSubmit }
              onCancel={ this.onCancel }
              schemaType="mozilla"
            />
          </div>
        </div>
      </Main>
    );
  }
}

const mapStateToProps = ({ portfolioReducer: { isLoading }}) => ({ isLoading });

const mapDispatchToProps = dispatch => bindActionCreators({
  addNotification,
  addPortfolio,
  fetchPortfolios
}, dispatch);

AddPortfolioModal.propTypes = {
  isLoading: propTypes.bool,
  addNotification: propTypes.func,
  fetchPortfolios: propTypes.func,
  addPortfolio: propTypes.func,
  closeModal: propTypes.func,
  itemdata: propTypes.object
};

export default connect(mapStateToProps, mapDispatchToProps)(AddPortfolioModal);
