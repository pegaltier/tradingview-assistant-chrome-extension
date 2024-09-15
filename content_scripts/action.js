const action = {
  workerStatus: null
}

const message = {
  errorsNoBacktest: 'There is no backtest data. Try to do a new backtest'
}

// https://github.com/extend-chrome/clipboard
const clipboardReadText = () =>
  new Promise((resolve, reject) => {
    // Create hidden input to receive text
    const el = document.createElement('textarea')
    el.value = 'before paste'
    document.body.append(el)

    // Paste from clipboard into input
    el.select()
    const success = document.execCommand('paste')

    // The contents of the clipboard
    const text = el.value
    el.remove()

    if (!success) reject(new Error('Unable to read from clipboard'))

    // Resolve with the contents of the clipboard
    resolve(text)
  })

const clipboardWriteText = (text) =>
  new Promise((resolve, reject) => {
    // Create hidden input with text
    const el = document.createElement('textarea')
    el.value = text
    document.body.append(el)

    // Select the text and copy to clipboard
    el.select()
    const success = document.execCommand('copy')
    el.remove()

    if (!success) reject(new Error('Unable to write to clipboard'))

    resolve(text)
  })

action.saveParameters = async () => {
  const strategyData = await tv.getStrategy(null, true)
  if(!strategyData || !strategyData.hasOwnProperty('name') || !strategyData.hasOwnProperty('properties') || !strategyData.properties) {
    await ui.showErrorPopup('The current indicator/strategy do not contain inputs that can be saved.')
    // await ui.showWarningPopup('Please open the indicator (strategy) parameters window before saving them to a file.')
    return
  }
  let strategyParamsCSV = `Name,Value\n"__indicatorName",${JSON.stringify(strategyData.name)}\n`
  Object.keys(strategyData.properties).forEach(key => {
    strategyParamsCSV += `${JSON.stringify(key)},${typeof strategyData.properties[key][0] === 'string' ? JSON.stringify(strategyData.properties[key]) : strategyData.properties[key]}\n`
  })
  file.saveAs(strategyParamsCSV, `${strategyData.name}_params.csv`)
}

action.saveClipboard = async () => {
  const strategyData = await tv.getStrategy(null, true)
  const ignoredBuilderKeys = ['P', '1', '2', '3', '4']
  if(!strategyData || !strategyData.hasOwnProperty('name') || !strategyData.hasOwnProperty('properties') || !strategyData.properties) {
    await ui.showErrorPopup('The current indicator/strategy do not contain inputs that can be saved.')
    // await ui.showWarningPopup('Please open the indicator (strategy) parameters window before saving them to a file.')
    return
  }

  let strategyParamskeys = '' 
  let strategyParamsValues = ''
  Object.keys(strategyData.properties).forEach(key => {
    if (strategyData.name === 'S_NCBLD') {
      if (!ignoredBuilderKeys.includes(key)) {
        strategyParamskeys += `${JSON.stringify(key)}`
        strategyParamsValues += `${typeof strategyData.properties[key][0] === 'string' ? JSON.stringify(strategyData.properties[key]) : strategyData.properties[key]},`
      }
    } else {
      strategyParamskeys += `${JSON.stringify(key)}`
      strategyParamsValues += `${typeof strategyData.properties[key][0] === 'string' ? JSON.stringify(strategyData.properties[key]) : strategyData.properties[key]},`
    }
  })
  console.log('🚀 ~ DEBUG ~ saveClipboard:', {strategyData, strategyParamskeys, strategyParamsValues});
  const currentTF = await tvChart.getCurrentTimeFrame()
  const currentTicker = await tvChart.getTicker()
  const presetText = strategyParamsValues.replaceAll('"', "").slice(0, -1)
  const finalText = `'${currentTicker}${currentTF}-9'=>',false,NAME1_XO,${presetText},EOL' // 09-2024(xtrades,x%)`
  clipboardWriteText(finalText)
  // file.saveAs(strategyParamsCSV.replaceAll('"', "'"), `${strategyData.name}_values.csv`)
}

action.loadParameters = async () => {
  await file.upload(file.uploadHandler, '', false)
}

action.loadClipboard = async () => {
  // to use this feature just copy the full line from the source and the script below will extract the desired variables from the full line
  const strategyData = await tv.getStrategy(null, true)
  if (strategyData.name === 'S_NCBLD') {
    const valuesClipboard = await clipboardReadText(); 
    const valuesClipboardFormat = valuesClipboard.replaceAll(' ','').replaceAll("'",'')
    const keys = ['X','Y','Z','◼','♢','♦️','⬡','←','⚡︎','→','↕️','⚛','♾','L','R','A','B','C','D','E','F','G','H','I','J','K','O','★','∞','U','V','M','N','T','S','１','𝟏','➀','➊','２','𝟐','➁','➋','３','𝟑','➂','➌','４','𝟒','➃','➍','５','𝟓','➄','➎','６','𝟔','➅','➏','７','𝟕','➆','➐','８','𝟖','➇','➑']
    const values = valuesClipboardFormat.split('[')[1].split(']')[0].split(',').slice(2) // this will extract from the full line only the necessary part
    if (keys.length === values.length) {
      const propVal = {'P': 0}
      for (let i = 0; i < keys.length; i++) {
        propVal[keys[i]] = values[i]
      }
      const res = await tv.setStrategyParams('S_NCBLD', propVal, true)
      console.log('🚀 ~ DEBUG ~ loadClipboard OK:', {values, valuesClipboard, res});
    } else {
      console.log('🚀 ~ DEBUG ~ loadClipboard ERROR keys mismatch:', {keysLength: keys.length, valuesLength: values.length, keys, values});
    }
  } else {
    console.log('🚀 ~ DEBUG ~ loadClipboard incorrect strategy', strategyData.name);
  }
}

action.loadPreset = async (preset) => {
  const strategyData = await tv.getStrategy(null, true)
  if (strategyData.name === 'S_NCBLD') {
    const ticker = preset.split('-')[0];
    const timeframe = preset.split('-')[1];
    const presetNumber = preset.split('-')[2];

    // const timeframeOK = /^-?\d+$/.test(timeframe) ? (parseInt(timeframe, 10) / 60) + 'H' : timeframe
    const isMinutes = tvChart.isTFDataMinutes(timeframe)
    const tfNormValue = isMinutes ? tvChart.minutesToTF(timeframe, isMinutes, 0) : timeframe
    console.log('🚀 ~ DEBUG ~ loadPreset OK:', {ticker, timeframe, tfNormValue, preset});
    await tvChart.changeTicker(ticker)
    await tvChart.changeTimeFrame(tfNormValue)

    const propVal = {'P': presetNumber}
    const res = await tv.setStrategyParams('S_NCBLD', propVal, true)
  } else {
    console.log('🚀 ~ DEBUG ~ loadClipboard incorrect strategy', strategyData.name);
  }
  
}

action.uploadSignals = async () => {
  await file.upload(signal.parseTSSignalsAndGetMsg, `Please check if the ticker and timeframe are set like in the downloaded data and click on the parameters of the "iondvSignals" script to automatically enter new data on the chart.`, true)
}

action.uploadStrategyTestParameters = async () => {
  await file.upload(model.parseStrategyParamsAndGetMsg, '', false)
}

action.getStrategyTemplate = async () => {
  const strategyData = await tv.getStrategy()
  if(!strategyData || !strategyData.hasOwnProperty('name') || !strategyData.hasOwnProperty('properties') || !strategyData.properties) {
    await ui.showErrorPopup('The current strategy do not contain inputs, than can be saved')
  } else {
    const paramRange = model.getStrategyRange(strategyData)
    console.log(paramRange)
    // await storage.setKeys(storage.STRATEGY_KEY_PARAM, paramRange)
    const strategyRangeParamsCSV = model.convertStrategyRangeToTemplate(paramRange)
    await ui.showPopup('The range of parameters is saved for the current strategy.\n\nYou can start optimizing the strategy parameters by clicking on the "Test strategy" button')
    file.saveAs(strategyRangeParamsCSV, `${strategyData.name}.csv`)
  }
}

action.clearAll = async () => {
  const clearRes = await storage.clearAll()
  await ui.showPopup(clearRes && clearRes.length ? `The data was deleted: \n${clearRes.map(item => '- ' + item).join('\n')}` : 'There was no data in the storage')
}

action.previewStrategyTestResults = async () => {
  const testResults = await storage.getKey(storage.STRATEGY_KEY_RESULTS)
  if(!testResults || (!testResults.perfomanceSummary && !testResults.perfomanceSummary.length)) {
    await ui.showWarningPopup(message.errorsNoBacktest)
    return
  }
  console.log('previewStrategyTestResults', testResults)
  const eventData = await sendActionMessage(testResults, 'previewStrategyTestResults')
  if (eventData.hasOwnProperty('message'))
    await ui.showPopup(eventData.message)

  // await ui.showPreviewResults(previewResults) // WHY NOT WORKING ?
}

action.downloadStrategyTestResults = async () => {
  const testResults = await storage.getKey(storage.STRATEGY_KEY_RESULTS)
  if(!testResults || (!testResults.perfomanceSummary && !testResults.perfomanceSummary.length)) {
    await ui.showWarningPopup(message.errorsNoBacktest)
    return
  }
  testResults.optParamName = testResults.optParamName || backtest.DEF_MAX_PARAM_NAME
  console.log('downloadStrategyTestResults', testResults)
  const CSVResults = file.convertResultsToCSV(testResults)
  const bestResult = testResults.perfomanceSummary ? model.getBestResult(testResults) : {}
  const propVal = {}
  testResults.paramsNames.forEach(paramName => {
    if(bestResult.hasOwnProperty(`__${paramName}`))
      propVal[paramName] = bestResult[`__${paramName}`]
  })
  await tv.setStrategyParams(testResults.shortName, propVal)
  if(bestResult && bestResult.hasOwnProperty(testResults.optParamName))
    await ui.showPopup(`The best found parameters are set for the strategy\n\nThe best ${testResults.isMaximizing ? '(max) ':'(min)'} ${testResults.optParamName}: ` + bestResult[testResults.optParamName])
  file.saveAs(CSVResults, `${testResults.ticker}:${testResults.timeFrame} ${testResults.shortName} - ${testResults.cycles}_${testResults.isMaximizing ? 'max':'min'}_${testResults.optParamName}_${testResults.method}.csv`)
}


action.testStrategy = async (request, isDeepTest = false) => {
  try {
    const strategyData = await action._getStrategyData()
    const [allRangeParams, paramRange, cycles] = await action._getRangeParams(strategyData)
    console.log('🚀 ~ DEBUG testStrategy:', {allRangeParams, paramRange, cycles});
    if(allRangeParams !== null) { // click cancel on parameters
      const testParams = await action._getTestParams(request, strategyData, allRangeParams, paramRange, cycles)
      console.log('Test parameters', testParams)
      action._showStartMsg(testParams.paramSpace, testParams.cycles, testParams.backtestDelay ? ` with delay between tests ${testParams.backtestDelay} sec` : '')
      testParams.isDeepTest = isDeepTest
      await tv.setDeepTest(isDeepTest, testParams.deepStartDate)

      let testResults = {}
      if (testParams.shouldTestTF) {
        if (!testParams.listOfTF || testParams.listOfTF.length === 0) {
          await ui.showWarningPopup(`You set to test timeframes in options, but timeframes list after correction values is empty: ${testParams.listOfTFSource}\nPlease set correct one with separation by comma. \nFor example: 1m,4h`)
        } else {
          let bestValue = null
          let bestTf = null
          testParams.shouldSkipInitBestResult = true
          for (const tf of testParams.listOfTF) {
            console.log('\nTest timeframe:', tf)
            await tvChart.changeTimeFrame(tf)
            testParams.timeFrame = tf
            if(testParams.hasOwnProperty('bestPropVal'))
              delete testParams.bestPropVal
            if(testParams.hasOwnProperty('bestValue'))
              delete testParams.bestValue
            testResults = await backtest.testStrategy(testParams, strategyData, allRangeParams) // TODO think about not save, but store them from  testResults.perfomanceSummary, testResults.filteredSummary = [], testResults.timeFrame to list
            await action._saveTestResults(testResults, testParams, false)
            if (bestTf === null) {
              bestValue = testResults.bestValue
              bestTf = tf
            } else if (testResults.isMaximizing ? testParams.bestValue > bestValue : testParams.bestValue < bestValue) {
              bestValue = testResults.bestValue
              bestTf = tf
            }
            if (action.workerStatus === null) {
              console.log('Stop command detected')
              break
            }
          }
          if (bestValue !== null) {
            await ui.showPopup(`The best value ${bestValue} for timeframe ${bestTf}. Check the saved files to get the best result parameters`)
          } else {
            await ui.showWarningPopup(`Did not found any result value after testing`)
          }
        }
      } else {
        testResults = await backtest.testStrategy(testParams, strategyData, allRangeParams)
        await action._saveTestResults(testResults, testParams)
      }
      if (isDeepTest)
        await tv.setDeepTest(!isDeepTest) // Reverse (switch off)
    }
  } catch (err) {
    console.error(err)
    await ui.showErrorPopup(`${err}`)
  }
  ui.statusMessageRemove()
}

action._getRangeParams = async (strategyData) => {
  let paramRange = await model.getStrategyParameters(strategyData)
  console.log('paramRange', paramRange)
  if(paramRange === null)
    // throw new Error('Error get changed strategy parameters')
    return [null, null, null]

  const initParams = {}
  initParams.paramRange = paramRange
  initParams.paramRangeSrc = model.getStrategyRange(strategyData)
  const changedStrategyParams = await ui.showAndUpdateStrategyParameters(initParams)
  if(changedStrategyParams === null) {
    return [null, null, null]
  }
  const cycles = changedStrategyParams.cycles ? changedStrategyParams.cycles : 100
  console.log('changedStrategyParams', changedStrategyParams)
  if (changedStrategyParams.paramRange === null) {
    console.log('Don not change paramRange')
  } else if (typeof changedStrategyParams.paramRange === 'object' && Object.keys(changedStrategyParams.paramRange).length) {
    paramRange = changedStrategyParams.paramRange
    await model.saveStrategyParameters(paramRange)
    console.log('ParamRange changes to', paramRange)
  } else {
    throw new Error ('The strategy parameters invalid. Change them or run default parameters set.')
  }

  const allRangeParams = model.createParamsFromRange(paramRange)
  console.log('allRangeParams', allRangeParams)
  if(!allRangeParams) {
    throw new Error ('Empty range parameters for strategy')
  }
  return [allRangeParams, paramRange, cycles]
}

action._getStrategyData = async () => {
  ui.statusMessage('Get the initial parameters.')
  const strategyData = await tv.getStrategy()
  if(!strategyData || !strategyData.hasOwnProperty('name') || !strategyData.hasOwnProperty('properties') || !strategyData.properties) {
    throw new Error('The current strategy do not contain inputs, than can be optimized. You can choose another strategy to optimize.')
  }
  return strategyData
}


action._parseTF = (listOfTF) => {
  if (!listOfTF || typeof (listOfTF) !== 'string')
    return []
  return listOfTF.split(',').map(tf => tf.trim()).filter(tf => /(^\d{1,2}m$)|(^\d{1,2}h$)|(^\d{1,2}D$)|(^\d{1,2}W$)|(^\d{1,2}M$)/.test(tf))

}

action._getTestParams = async (request, strategyData, allRangeParams, paramRange, cycles) => {
  let testParams = await tv.switchToStrategyTab()
  const options = request && request.hasOwnProperty('options') ? request.options : {  }
  const testMethod = options.hasOwnProperty('optMethod') && typeof (options.optMethod) === 'string' ? options.optMethod.toLowerCase() : 'random'
  let paramSpaceNumber = 0
  let isSequential = false
  if(['sequential'].includes(testMethod)) {
    paramSpaceNumber = Object.keys(allRangeParams).reduce((sum, param) => sum += allRangeParams[param].length, 0)
    isSequential = true
  } else {
    paramSpaceNumber = Object.keys(allRangeParams).reduce((mult, param) => mult *= allRangeParams[param].length, 1)
  }
  console.log('paramSpaceNumber', paramSpaceNumber)

  testParams.shouldTestTF = options.hasOwnProperty('shouldTestTF') ? options.shouldTestTF : false
  testParams.listOfTF = action._parseTF(options.listOfTF)
  testParams.listOfTFSource = options.listOfTF
  testParams.shouldSkipInitBestResult = false // TODO get from options

  testParams.paramSpace = paramSpaceNumber
  let paramPriority = model.getParamPriorityList(paramRange) // Filter by allRangeParams
  paramPriority = paramPriority.filter(key => allRangeParams.hasOwnProperty(key))
  console.log('paramPriority list', paramPriority)
  testParams.paramPriority = paramPriority

  testParams.startParams = await model.getStartParamValues(paramRange, strategyData)
  console.log('testParams.startParams', testParams.startParams)
  if(!testParams.hasOwnProperty('startParams') || !testParams.startParams.hasOwnProperty('current') || !testParams.startParams.current) {
    throw new Error('Error.\n\n The current strategy parameters could not be determined.\n Testing aborted')
  }

  testParams.cycles = cycles


  if(request.options) {
    testParams.isMaximizing = request.options.hasOwnProperty('isMaximizing') ? request.options.isMaximizing : true
    testParams.optParamName =  request.options.optParamName ? request.options.optParamName : backtest.DEF_MAX_PARAM_NAME
    testParams.method = testMethod
    testParams.filterAscending = request.options.hasOwnProperty('optFilterAscending') ? request.options.optFilterAscending : null
    testParams.filterValue = request.options.hasOwnProperty('optFilterValue') ? request.options.optFilterValue : 50
    testParams.filterParamName = request.options.hasOwnProperty('optFilterParamName') ? request.options.optFilterParamName : 'Total Closed Trades: All'
    testParams.deepStartDate = !request.options.hasOwnProperty('deepStartDate') || request.options['deepStartDate'] === '' ? null : request.options['deepStartDate']
    testParams.backtestDelay = !request.options.hasOwnProperty('backtestDelay') || !request.options['backtestDelay'] ? 0 : request.options['backtestDelay']
    testParams.randomDelay = request.options.hasOwnProperty('randomDelay') ? Boolean(request.options['randomDelay']) : true
    testParams.shouldSkipInitBestResult = request.options.hasOwnProperty('shouldSkipInitBestResult') ? Boolean(request.options['shouldSkipInitBestResult']) : false
    testParams.shouldSkipWaitingForDownload = request.options.hasOwnProperty('shouldSkipWaitingForDownload') ? Boolean(request.options['shouldSkipWaitingForDownload']) : false
    testParams.dataLoadingTime = request.options.hasOwnProperty('dataLoadingTime') && !isNaN(parseInt(request.options['dataLoadingTime'])) ? request.options['dataLoadingTime'] :30
  }
  return testParams
}

action._showStartMsg = (paramSpaceNumber, cycles, addInfo) => {
  let extraHeader = `The search is performed among ${paramSpaceNumber} possible combinations of parameters (space).`
  extraHeader += (paramSpaceNumber/cycles) > 10 ? `<br />This is too large for ${cycles} cycles. It is recommended to use up to 3-4 essential parameters, remove the rest from the strategy parameters file.` : ''
  ui.statusMessage(`Started${addInfo}.`, extraHeader)
}

action._saveTestResults = async (testResults, testParams, isFinalTest = true) => {
  console.log('testResults', testResults)
  if(!testResults.perfomanceSummary && !testResults.perfomanceSummary.length) {
    await ui.showWarningPopup('There is no testing data for saving. Try to do test again')
    return
  }

  const CSVResults = file.convertResultsToCSV(testResults)
  const bestResult = testResults.perfomanceSummary ? model.getBestResult(testResults) : {}
  const initBestValue = testResults.hasOwnProperty('initBestValue') ? testResults.initBestValue : null
  const propVal = {}
  testResults.paramsNames.forEach(paramName => {
    if(bestResult.hasOwnProperty(`__${paramName}`))
      propVal[paramName] = bestResult[`__${paramName}`]
  })
  if (isFinalTest)
    await tv.setStrategyParams(testResults.shortName, propVal)
  let text = `All done.\n\n`
  text += bestResult && bestResult.hasOwnProperty(testParams.optParamName) ? 'The best '+ (testResults.isMaximizing ? '(max) ':'(min) ') + testParams.optParamName + ': ' + backtest.convertValue(bestResult[testParams.optParamName]) : ''
  text += (initBestValue !== null && bestResult && bestResult.hasOwnProperty(testParams.optParamName) && initBestValue === bestResult[testParams.optParamName]) ? `\nIt isn't improved from the initial value: ${backtest.convertValue(initBestValue)}` : ''
  ui.statusMessage(text)
  console.log(`All done.\n\n${bestResult && bestResult.hasOwnProperty(testParams.optParamName) ? 'The best ' + (testResults.isMaximizing ? '(max) ':'(min) ')  + testParams.optParamName + ': ' + bestResult[testParams.optParamName] : ''}`)
  if(testParams.shouldSkipWaitingForDownload || !isFinalTest)
    file.saveAs(CSVResults, `${testResults.ticker}:${testResults.timeFrame}${testResults.isDeepTest ? ' deep backtesting' : ''} ${testResults.shortName} - ${testResults.cycles}_${testResults.isMaximizing ? 'max':'min'}_${testResults.optParamName}_${testResults.method}.csv`)
  if (isFinalTest) {
    await ui.showPopup(text)
    if(!testParams.shouldSkipWaitingForDownload)
       file.saveAs(CSVResults, `${testResults.ticker}:${testResults.timeFrame}${testResults.isDeepTest ? ' deep backtesting' : ''} ${testResults.shortName} - ${testResults.cycles}_${testResults.isMaximizing ? 'max':'min'}_${testResults.optParamName}_${testResults.method}.csv`)
  }
}


action.show3DChart = async () => {
  const testResults = await storage.getKey(storage.STRATEGY_KEY_RESULTS)
  if(!testResults || (!testResults.perfomanceSummary && !testResults.perfomanceSummary.length)) {
    await ui.showPopup('There is no results data for to show. Try to backtest again')
    return
  }
  testResults.optParamName = testResults.optParamName || backtest.DEF_MAX_PARAM_NAME
  const eventData = await sendActionMessage(testResults, 'show3DChart')
  if (eventData.hasOwnProperty('message'))
    await ui.showPopup(eventData.message)
}

async function sendActionMessage(data, action) {
  return new Promise(resolve => {
    const url =  window.location && window.location.origin ? window.location.origin : 'https://www.tradingview.com'
    tvPageMessageData[action] = resolve
    window.postMessage({name: 'iondvScript', action, data}, url) // TODO wait for data
  })
}