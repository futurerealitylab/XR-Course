

void* default_heap_allocate(void* data, usize byte_count)
{
#ifdef USE_ALIGNED_MEMORY_ALLOCATION
    return mem::aligned_alloc(16, align_up(byte_count, 16));
#else
    return mem::malloc(byte_count);
#endif
}

void default_heap_deallocate(void* data, void* memory, usize count)
{
#ifdef USE_ALIGNED_MEMORY_ALLOCATION
    return mem::aligned_free(memory);
#else
    return mem::free(memory);
#endif
}


void* default_heap_resize(void* data, void* memory, usize byte_count, usize old_byte_count)
{
#ifdef USE_ALIGNED_MEMORY_ALLOCATION
    return mem::aligned_realloc(data, byte_count, old_byte_count);
#else
    return mem::realloc(data, byte_count, old_byte_count);
#endif
}

void* MTT_default_heap_allocate(void* data, usize byte_count)
{
    return default_heap_allocate(data, byte_count);
}

void MTT_default_heap_deallocate(void* data, void* memory, usize count)
{
    default_heap_deallocate(data, memory, count);
}

void* MTT_default_heap_resize(void* data, void* memory, usize byte_count, usize old_byte_count)
{
    return default_heap_resize(data, memory, byte_count, old_byte_count);
}