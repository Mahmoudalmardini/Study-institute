import { DefaultValuePipe, ParseIntPipe, Query } from '@nestjs/common';
import { ClampIntPipe } from '../pipes/clamp-int.pipe';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MAX_PAGE,
} from '../pagination/pagination.constants';

/** `?page=` as an integer in [1, MAX_PAGE]; blank, 0 or negative becomes 1. */
export const PageQuery = () =>
  Query(
    'page',
    new DefaultValuePipe(DEFAULT_PAGE),
    ParseIntPipe,
    new ClampIntPipe(1, MAX_PAGE, DEFAULT_PAGE),
  );

/** `?limit=` as an integer in [1, MAX_LIMIT]. */
export const LimitQuery = (defaultLimit: number = DEFAULT_LIMIT) =>
  Query(
    'limit',
    new DefaultValuePipe(defaultLimit),
    ParseIntPipe,
    new ClampIntPipe(1, MAX_LIMIT, defaultLimit),
  );
