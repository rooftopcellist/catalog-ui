import React, { useEffect, useReducer, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useRouteMatch, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { scrollToTop } from '../../helpers/shared/helpers';
import { toggleArraySelection } from '../../helpers/shared/redux-mutators';
import { fetchPlatforms } from '../../redux/actions/platform-actions';
import { fetchPlatforms as fetchPlatformsS } from '../../redux/actions/platform-actions-s';
import {
  copyPortfolio,
  fetchPortfolios,
  fetchSelectedPortfolio,
  removeProductsFromPortfolio,
  resetSelectedPortfolio,
  fetchPortfolioItemsWithPortfolio
} from '../../redux/actions/portfolio-actions';
import {
  copyPortfolio as copyPortfolioS,
  fetchPortfolios as fetchPortfoliosS,
  fetchSelectedPortfolio as fetchSelectedPortfolioS,
  removeProductsFromPortfolio as removeProductsFromPortfolioS,
  resetSelectedPortfolio as resetSelectedPortfolioS,
  fetchPortfolioItemsWithPortfolio as fetchPortfolioItemsWithPortfolioS
} from '../../redux/actions/portfolio-actions-s';
import asyncFormValidator from '../../utilities/async-form-validator';
import useQuery from '../../utilities/use-query';
import useBreadcrumbs from '../../utilities/use-breadcrumbs';
import { PORTFOLIO_ROUTE } from '../../constants/routes';
import { UnauthorizedRedirect } from '../error-pages/error-redirects';
import CatalogRoute from '../../routing/catalog-route';
import useIsMounted from '../../utilities/use-is-mounted';
import useInitialUriHash from '../../routing/use-initial-uri-hash';
import ToolbarRenderer from '../../toolbar/toolbar-renderer';
import { toolbarComponentTypes } from '../../toolbar/toolbar-mapper';
import BackToProducts from '../../presentational-components/portfolio/back-to-products';

/**
 * Fake the toolbar until the chunk is loaded
 */
const PortfolioSuspenseFallback = ({ fromProducts, title, description }) => (
  <ToolbarRenderer
    schema={{
      fields: [
        {
          component: toolbarComponentTypes.TOP_TOOLBAR,
          breadcrumbs: !fromProducts,
          key: 'portfolio-top-toolbar',
          fields: [
            {
              component: BackToProducts,
              key: 'back-to-products',
              hidden: !fromProducts
            },
            {
              component: toolbarComponentTypes.TOP_TOOLBAR_TITLE,
              key: 'portfolio-toolbar-title',
              title,
              description
            }
          ]
        }
      ]
    }}
  />
);

PortfolioSuspenseFallback.propTypes = {
  title: PropTypes.node,
  description: PropTypes.node,
  fromProducts: PropTypes.bool
};

const PortfolioItems = lazy(() =>
  /* webpackChunkName: "portfolio-items" */ import('./portfolio-items')
);

const PortfolioItemDetail = lazy(() =>
  import(
    /* webpackChunkName: "portfolio-item-detail" */
    './portfolio-item-detail/portfolio-item-detail'
  )
);
const AddProductsToPortfolio = lazy(() =>
  import(
    /* webpackChunkName: "add-products-to-portfolio" */
    './add-products-to-portfolio'
  )
);
const initialState = {
  selectedItems: [],
  firstSelectedProduct: undefined,
  removeInProgress: false,
  filterValue: '',
  copyInProgress: false,
  isFetching: true,
  isFiltering: false
};

const debouncedFilter = asyncFormValidator(
  (value, dispatch, filteringCallback, meta) => {
    filteringCallback(true);
    dispatch(
      localStorage.getItem('catalog_standalone')
        ? fetchPortfolioItemsWithPortfolioS(value, meta)
        : fetchPortfolioItemsWithPortfolio(value, meta)
    ).then(() => filteringCallback(false));
  },
  1000
);

const porftolioUiReducer = (state, { type, payload = {} }) =>
  ({
    selectItem: {
      ...state,
      selectedItems: toggleArraySelection(
        state.selectedItems,
        payload.selectedItem
      ),
      firstSelectedProduct: payload.product || state.firstSelectedProduct
    },
    setRemoveInProgress: { ...state, removeInProgress: payload },
    removeSuccessful: { ...state, selectedItems: [], removeInProgress: false },
    setFilterValue: { ...state, filterValue: payload, isFiltering: true },
    setCopyInProgress: { ...state, copyInProgress: payload },
    setIsFetching: { ...state, isFetching: payload },
    setFilteringFlag: { ...state, isFiltering: payload }
  }[type]);

const Portfolio = () => {
  const viewState = useInitialUriHash();
  const [state, stateDispatch] = useReducer(porftolioUiReducer, {
    ...initialState,
    filterValue: viewState?.portfolioItems?.filter || ''
  });
  const [searchParams] = useQuery(['portfolio', 'from-products']);
  const { portfolio: id, 'from-products': fromProducts } = searchParams;
  const { url } = useRouteMatch(PORTFOLIO_ROUTE);
  const history = useHistory();
  const dispatch = useDispatch();
  const isMounted = useIsMounted();
  const { portfolio, portfolioItem, meta } = useSelector(
    ({
      portfolioReducer: {
        selectedPortfolio,
        portfolioItem,
        portfolioItems: { meta }
      }
    }) => ({
      portfolio: selectedPortfolio,
      portfolioItem,
      meta
    })
  );

  const resetBreadcrumbs = useBreadcrumbs([portfolio, portfolioItem]);

  const fetchData = (portfolioId) => {
    stateDispatch({ type: 'setIsFetching', payload: true });
    return Promise.all([
      dispatch(
        localStorage.getItem('catalog_standalone')
          ? fetchPlatformsS()
          : fetchPlatforms()
      ),
      dispatch(
        window?.catalog?.standalone
          ? fetchSelectedPortfolioS(portfolioId)
          : fetchSelectedPortfolio(portfolioId)
      ),
      dispatch(
        window?.catalog?.standalone
          ? fetchPortfolioItemsWithPortfolioS(
              portfolioId,
              viewState?.portfolioItems
            )
          : fetchPortfolioItemsWithPortfolio(
              portfolioId,
              viewState?.portfolioItems
            )
      )
    ])
      .then((data) => {
        if (isMounted.current) {
          stateDispatch({ type: 'setIsFetching', payload: false });
        }

        return data;
      })
      .catch(() => stateDispatch({ type: 'setIsFetching', payload: false }));
  };

  useEffect(() => {
    fetchData(id);
    scrollToTop();

    return () => {
      resetBreadcrumbs();
      dispatch(
        localStorage.getItem('catalog_standalone')
          ? resetSelectedPortfolioS()
          : resetSelectedPortfolio()
      );
    };
  }, []);

  useEffect(() => {
    if (
      isMounted.current === true &&
      !state.isFetching &&
      history.location.pathname === PORTFOLIO_ROUTE
    ) {
      fetchData(id);
      scrollToTop();
    }
  }, [id, history.location.pathname]);

  const handleCopyPortfolio = () => {
    stateDispatch({ type: 'setCopyInProgress', payload: true });
    return dispatch(
      localStorage.getItem('catalog_standalone')
        ? copyPortfolioS(id)
        : copyPortfolio(id)
    )
      .then(({ id }) =>
        history.push({
          pathname: PORTFOLIO_ROUTE,
          search: `?portfolio=${id}`
        })
      )
      .then(() => stateDispatch({ type: 'setCopyInProgress', payload: false }))
      .then(() =>
        dispatch(
          localStorage.getItem('catalog_standalone')
            ? fetchPortfoliosS
            : fetchPortfolios
        )
      )
      .catch(() =>
        stateDispatch({ type: 'setCopyInProgress', payload: false })
      );
  };

  const removeProducts = (products) => {
    stateDispatch({ type: 'setRemoveInProgress', payload: true });
    dispatch(
      localStorage.getItem('catalog_standalone')
        ? removeProductsFromPortfolioS(
            products,
            portfolio.name,
            state.firstSelectedProduct
          )
        : removeProductsFromPortfolio(
            products,
            portfolio.name,
            state.firstSelectedProduct
          )
    )
      .then(() => stateDispatch({ type: 'removeSucessfull' }))
      .catch(() =>
        stateDispatch({ type: 'setRemoveInProgress', payload: false })
      );
  };

  const handleFilterChange = (filter) => {
    stateDispatch({ type: 'setFilterValue', payload: filter });
    debouncedFilter(
      id,
      dispatch,
      (isFiltering) =>
        stateDispatch({ type: 'setFilteringFlag', payload: isFiltering }),
      {
        ...meta,
        offset: 0,
        filter
      }
    );
  };

  const routes = {
    portfolioRoute: url,
    addProductsRoute: `${url}/add-products`,
    editPortfolioRoute: `${url}/edit-portfolio`,
    removePortfolioRoute: `${url}/remove-portfolio`,
    sharePortfolioRoute: `${url}/share-portfolio`,
    workflowPortfolioRoute: `${url}/edit-workflow`,
    portfolioItemRoute: `${url}/portfolio-item`
  };

  if (portfolio.metadata?.user_capabilities?.show === false) {
    return <UnauthorizedRedirect />;
  }

  return (
    <Suspense
      fallback={
        <PortfolioSuspenseFallback
          fromProducts={fromProducts === 'true'}
          title={portfolio.name}
          description={portfolio.description}
        />
      }
    >
      <Switch>
        <CatalogRoute
          path={routes.addProductsRoute}
          userCapabilities={portfolio.metadata?.user_capabilities}
          requiredCapabilities="update"
        >
          <AddProductsToPortfolio portfolioRoute={routes.portfolioRoute} />
        </CatalogRoute>
        <Route path={routes.portfolioItemRoute}>
          <PortfolioItemDetail portfolioLoaded={!state?.isFetching} />
        </Route>
        <Route path={routes.portfolioRoute}>
          <PortfolioItems
            routes={routes}
            fromProducts={fromProducts === 'true'}
            handleFilterChange={handleFilterChange}
            removeProducts={(products) => removeProducts(products)}
            copyPortfolio={handleCopyPortfolio}
            state={state}
            stateDispatch={stateDispatch}
          />
        </Route>
      </Switch>
    </Suspense>
  );
};

export default Portfolio;
