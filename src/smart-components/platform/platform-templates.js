import React, { Fragment, useEffect, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SearchIcon } from '@patternfly/react-icons';
import { scrollToTop } from '../../helpers/shared/helpers';
import ToolbarRenderer from '../../toolbar/toolbar-renderer';
import { defaultSettings } from '../../helpers/shared/pagination';
import { fetchPlatformItems } from '../../redux/actions/platform-actions';
import { fetchPlatformItems as fetchPlatformItemsS } from '../../redux/actions/platform-actions-s';
import PlatformItem from '../../presentational-components/platform/platform-item';
import { createPlatformsFilterToolbarSchema } from '../../toolbar/schemas/platforms-toolbar.schema';
import ContentGalleryEmptyState from '../../presentational-components/shared/content-gallery-empty-state';
import asyncFormValidator from '../../utilities/async-form-validator';
import ContentGallery from '../content-gallery/content-gallery';
import { Button } from '@patternfly/react-core';
import AsyncPagination from '../common/async-pagination';
import BottomPaginationContainer from '../../presentational-components/shared/bottom-pagination-container';
import useQuery from '../../utilities/use-query';
import { PLATFORM_SERVICE_OFFERINGS_ROUTE } from '../../constants/routes';
import filteringMessages from '../../messages/filtering.messages';
import platformsMessages from '../../messages/platforms.messages';
import useFormatMessage from '../../utilities/use-format-message';

const initialState = {
  filterValue: '',
  isOpen: false,
  isFetching: true,
  isFiltering: false
};

const platformItemsState = (state, action) => {
  switch (action.type) {
    case 'setFetching':
      return { ...state, isFetching: action.payload };
    case 'setFilterValue':
      return { ...state, filterValue: action.payload };
    case 'setFilteringFlag':
      return { ...state, isFiltering: action.payload };
    default:
      return state;
  }
};

const debouncedFilter = asyncFormValidator(
  (id, value, dispatch, filteringCallback, meta = defaultSettings) => {
    filteringCallback(true);
    dispatch(
      localStorage.getItem('catalog_standalone')
        ? fetchPlatformItemsS(id, value, meta)
        : fetchPlatformItems(id, value, meta)
    ).then(() => filteringCallback(false));
  },
  1000
);

const PlatformTemplates = () => {
  const formatMessage = useFormatMessage();
  const [{ platform: id }] = useQuery(['platform']);
  const [{ filterValue, isFetching, isFiltering }, stateDispatch] = useReducer(
    platformItemsState,
    initialState
  );
  const {
    data,
    results,
    count,
    meta
  } = useSelector(({ platformReducer: { platformItems } }) =>
    platformItems[id]
      ? platformItems[id]
      : { data: [], results: [], meta: defaultSettings, count: 0 }
  );

  const { platform, platformIconMapping } = useSelector(
    ({ platformReducer: { selectedPlatform, platformIconMapping } }) => ({
      platform: selectedPlatform,
      platformIconMapping
    })
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      localStorage.getItem('catalog_standalone')
        ? fetchPlatformItemsS(id, filterValue, defaultSettings)
        : fetchPlatformItems(id, filterValue, defaultSettings)
    ).then(() => stateDispatch({ type: 'setFetching', payload: false }));
    scrollToTop();
  }, [id]);

  const dataSet = data ? data : results;
  const metaInfo = meta ? meta : { count };

  const handleFilterChange = (value) => {
    stateDispatch({ type: 'setFilterValue', payload: value });
    debouncedFilter(
      id,
      value,
      dispatch,
      (isFiltering) =>
        stateDispatch({ type: 'setFilteringFlag', payload: isFiltering }),
      {
        ...metaInfo,
        offset: 0
      }
    );
  };

  const filteredItems = {
    items: dataSet
      ? dataSet.map((item) => (
          <PlatformItem
            key={item.id}
            pathname={PLATFORM_SERVICE_OFFERINGS_ROUTE}
            searchParams={{
              service: item.id
            }}
            preserveSearch
            src={platformIconMapping[id]}
            {...item}
          />
        ))
      : []
  };

  const title = platform ? platform.name : '';
  return (
    <Fragment>
      <ToolbarRenderer
        schema={createPlatformsFilterToolbarSchema({
          onFilterChange: handleFilterChange,
          searchValue: filterValue,
          filterPlaceholder: formatMessage(platformsMessages.templatesFilter),
          meta: metaInfo,
          apiRequest: (_, options) =>
            dispatch(
              localStorage.getItem('catalog_standalone')
                ? fetchPlatformItemsS(id, filterValue, options)
                : fetchPlatformItems(id, filterValue, options)
            )
        })}
      />
      <ContentGallery
        title={title}
        isLoading={isFetching || isFiltering}
        renderEmptyState={() => (
          <ContentGalleryEmptyState
            title={
              filterValue === ''
                ? formatMessage(platformsMessages.noTemplatesTitle)
                : formatMessage(filteringMessages.noResults)
            }
            Icon={SearchIcon}
            PrimaryAction={() =>
              filterValue !== '' ? (
                <Button
                  ouiaId={'clear-filters'}
                  onClick={() => handleFilterChange('')}
                  variant="link"
                >
                  {formatMessage(filteringMessages.clearFilters)}
                </Button>
              ) : null
            }
            description={
              filterValue === ''
                ? formatMessage(platformsMessages.noTemplatesDescription)
                : formatMessage(filteringMessages.noResultsDescription)
            }
          />
        )}
        {...filteredItems}
      />
      {metaInfo.count > 0 && (
        <BottomPaginationContainer>
          <AsyncPagination
            dropDirection="up"
            meta={metaInfo}
            apiRequest={(_, options) =>
              dispatch(
                localStorage.getItem('catalog_standalone')
                  ? fetchPlatformItemsS(id, filterValue, options)
                  : fetchPlatformItems(id, filterValue, options)
              )
            }
          />
        </BottomPaginationContainer>
      )}
    </Fragment>
  );
};

export default PlatformTemplates;
