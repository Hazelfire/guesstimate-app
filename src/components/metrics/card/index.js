import React, {Component, PropTypes} from 'react'
import ReactDOM from 'react-dom'

import { connect } from 'react-redux';
import { removeMetric, changeMetric } from 'gModules/metrics/actions.js'
import { changeGuesstimate } from 'gModules/guesstimates/actions.js'
import { changeGuesstimateForm } from 'gModules/guesstimate_form/actions.js'

import MetricModal from '../modal/index.js'
import DistributionEditor from 'gComponents/distributions/editor/index.js'
import MetricToolTip from './tooltip.js'
import $ from 'jquery'
import './style.css'
import * as canvasStateProps from 'gModules/canvas_state/prop_type.js'
import MetricCardViewSection from './MetricCardViewSection/index.js'

const INTERMEDIATE = 'INTERMEDIATE'
const OUTPUT = 'OUTPUT'
const INPUT = 'INPUT'
const NOEDGE = 'NOEDGE'

const relationshipClasses = {}
relationshipClasses[INTERMEDIATE] = 'intermediate'
relationshipClasses[OUTPUT] = 'output'
relationshipClasses[INPUT] = 'input'
relationshipClasses[NOEDGE] = 'noedge'

const relationshipType = (edges) => {
  if (edges.inputs.length && edges.outputs.length) { return INTERMEDIATE }
  if (edges.inputs.length) { return OUTPUT }
  if (edges.outputs.length) { return INPUT }
  return NOEDGE
}

const PT = PropTypes
class MetricCard extends Component {
  displayName: 'MetricCard'

  static propTypes = {
    canvasState: canvasStateProps.canvasState,
    dispatch: PT.func.isRequired,
    gridKeyPress: PT.func.isRequired,
    guesstimateForm: PT.object.isRequired,
    handleSelect: PT.func.isRequired,
    isSelected: PT.bool.isRequired,
    location: PT.shape({
      row: PT.number,
      column: PT.number
    }),
    metric: PT.object.isRequired
  }

  state = {modalIsOpen: false};

  componentDidUpdate() {
    const hasContent = this.refs.MetricCardViewSection.hasContent()
    if (!this.props.isSelected && this._isEmpty() && !hasContent){
      this.handleRemoveMetric()
    }
  }

  openModal() {
     this.setState({modalIsOpen: true});
  }

  closeModal() {
     this.setState({modalIsOpen: false});
  }

  _handlePress(e) {
    if (e.target === ReactDOM.findDOMNode(this)) {
      if (e.keyCode == '13') {
        e.preventDefault()
        this.openModal()
      }
      if (e.keyCode == '8') {
        e.preventDefault()
        this.handleRemoveMetric()
      }
      this.props.gridKeyPress(e)
    }
    e.stopPropagation()
  }

  _isEmpty(){
    return (!this._hasGuesstimate() && !this._hasName())
  }

  _hasName(){
    return !!this.props.metric.name
  }

  _hasGuesstimate(){
    const {metric} = this.props
    const hasInput = !_.isEmpty(_.get(metric, 'guesstimate.input'))
    const hasData = !_.isEmpty(_.get(metric, 'guesstimate.data'))
    return (hasInput || hasData)
  }

  _isTitle(){
    return (this._hasName() && !this._hasGuesstimate())
  }

  handleChangeMetric(values) {
    values.id = this._id()
    this.props.dispatch(changeMetric(values))
  }

  handleChangeGuesstimate(values) {
    let guesstimate = values
    guesstimate.metric = this.props.metric.id
    this.props.dispatch(changeGuesstimate(this._id(), guesstimate))
    this.props.dispatch(changeGuesstimateForm(guesstimate, true))
  }

  handleRemoveMetric () {
    this.props.dispatch(removeMetric(this._id()))
  }

  _id(){
    return this.props.metric.id
  }

  focus() {
    $(this.refs.dom).focus();
  }

  _focusForm() {
    const editorRef = _.get(this.refs, 'DistributionEditor.refs.wrappedInstance')
    editorRef && editorRef.focus()
  }

  _handleClick(event) {
    const selectableEl = (event.target.parentElement.getAttribute('data-select') !== 'false')
    const notYetSelected = !this.props.isSelected
    if (selectableEl && notYetSelected){
      if (this.props.canvasState.metricClickMode === 'FUNCTION_INPUT_SELECT') {
        event.preventDefault()
        $(window).trigger('functionMetricClicked', this.props.metric)
      } else {
        this.props.handleSelect(this.props.location)
      }
    }
  }

  _className() {
    const {isSelected, metric, hovered} = this.props
    const {canvasState: {metricCardView}} = this.props
    const relationshipClass = relationshipClasses[relationshipType(metric.edges)]
    const titleView = !hovered && !isSelected && this._isTitle()

    // Sometimes we generate a 2 element array of 'undefined' values as errors, hence the filter.
    let className = isSelected ? 'metricCard grid-item-focus' : 'metricCard'
    className += ` ${metricCardView}`
    className += titleView ? ' titleView' : ''
    className += ' ' + relationshipClass
    return className
  }

  render() {
    const {isSelected, metric, guesstimateForm, canvasState} = this.props
    const {guesstimate} = metric

    let errors = _.get(metric, 'simulation.sample.errors')
    errors = errors ? errors.filter(e => !!e) : []

    return (
      <div
          className={this._className()}
          ref='dom'
          onKeyDown={this._handlePress.bind(this)}
          tabIndex='0'
      >
        {this.props.hovered && !isSelected &&
          <MetricToolTip guesstimate={guesstimate} errors={errors}/>
        }

        <MetricModal
            metric={metric}
            guesstimateForm={guesstimateForm}
            isOpen={this.state.modalIsOpen}
            closeModal={this.closeModal.bind(this)}
            onChange={this.handleChangeGuesstimate.bind(this)}
        />

        <MetricCardViewSection
            canvasState={canvasState}
            metric={metric}
            isSelected={isSelected}
            onChangeName={this.handleChangeMetric.bind(this)}
            guesstimateForm={guesstimateForm}
            onOpenModal={this.openModal.bind(this)}
            jumpSection={this._focusForm.bind(this)}
            onClick={this._handleClick.bind(this)}
            ref='MetricCardViewSection'
            hasErrors={errors.length > 0}
        />

        {isSelected && !this.state.modalIsOpen &&
          <div className='section editing'>
            <DistributionEditor
                metricId={metric.id}
                metricFocus={this.focus.bind(this)}
                onOpen={this.openModal.bind(this)}
                ref='DistributionEditor'
                size='small'
            />
          </div>
        }
      </div>
    );
  }
}

function select(state) {
  return {
    guesstimateForm: state.guesstimateForm
  }
}

module.exports = connect(select)(MetricCard);
