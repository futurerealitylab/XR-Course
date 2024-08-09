#ifndef MTT_ARRAY_HPP
#define MTT_ARRAY_HPP

#include "memory.hpp"

#define TYPE_T template<typename T>
#define TYPE_T_SIZE_N template<typename T, usize N>

namespace mtt {

template <typename T>
inline void* memmove(void *dst, const void *src, size_t len)
{
    if constexpr ((std::is_standard_layout<T>::value && std::is_trivially_copyable<T>::value)) {
        
        return ::memmove(dst, src, len);
    }
    
    uint8_t* from = (uint8_t*)src;
    uint8_t* to   = (uint8_t*)dst;
    usize n = len;
    
    if (from == to || n == 0) {
        return dst;
    }
    
    usize count = n / sizeof(T);
    
    // overlapping cases
    if (to > from && to-from < (long long)n) {
        
        T* mto   = (T*)dst;
        T* mfrom = (T*)src;
        
        
        /* to overlaps with from */
        /*  <from......>         */
        /*         <to........>  */
        /* copy in reverse, to avoid overwriting from */
        long long i;
        for(i=count-1; i>=0; i--) {
            mto[i] = std::move(mfrom[i]);
        }
        return dst;
    } else if (from > to && from-to < (long long)n) {
        
        T* mto   = (T*)dst;
        T* mfrom = (T*)src;
        
        /* to overlaps with from */
        /*        <from......>   */
        /*  <to........>         */
        /* copy forwards, to avoid overwriting from */
        size_t i;
        for(i=0; i<count; i++) {
            mto[i] = std::move(mfrom[i]);
        }
        return dst;
    }
    
    // non-overlapping
    T* mto   = (T*)dst;
    T* mfrom = (T*)src;
    
    for (usize i = 0; i < count; i += 1) {
        mto[i] = std::move(mfrom[i]);
    }
    
    return dst;
}

#if defined(__OBJC__)
template <>
inline void* memmove<id>(void *dst, const void *src, size_t len)
{
    uint8_t* from = (uint8_t*)src;
    uint8_t* to   = (uint8_t*)dst;
    usize n = len;
    
    if (from == to || n == 0) {
        return dst;
    }
    
    usize count = n / sizeof(id);
    
    // overlapping cases
    if (to > from && to-from < (long long)n) {
        
        __weak id* to_objc   = (__weak id*)dst;
        __weak id* from_objc = (__weak id*)src;
        
        
        /* to overlaps with from */
        /*  <from......>         */
        /*         <to........>  */
        /* copy in reverse, to avoid overwriting from */
        long long i;
        for(i=count-1; i>=0; i--) {
            to_objc[i]   = nil;
            to_objc[i]   = from_objc[i];
            from_objc[i] = nil;
        }
        return dst;
    } else if (from > to && from-to < (long long)n) {
        
        __weak id* to_objc   = (__weak id*)dst;
        __weak id* from_objc = (__weak id*)src;
        
        /* to overlaps with from */
        /*        <from......>   */
        /*  <to........>         */
        /* copy forwards, to avoid overwriting from */
        size_t i;
        for(i=0; i<count; i++) {
            to_objc[i]   = nil;
            to_objc[i]   = from_objc[i];
            from_objc[i] = nil;
        }
        return dst;
    }
    
    // non-overlapping
    __strong id* to_objc = (__strong id*)dst;
    __strong id* from_objc = (__strong id*)src;
    
    for (usize i = 0; i < count; i += 1) {
        to_objc[i]   = nil;
        to_objc[i]   = from_objc[i];
        from_objc[i] = nil;
    }
    
    return dst;
}
#endif


struct alignas(16) Array_Slice_Raw {
    usize count;
    void* data;
    usize type_size;
    void* end;
    
    inline usize size()
    {
        return this->count;
    }
    
    typedef void* iterator;
    typedef const void* const_iterator;
    iterator begin_ptr(void) { return this->data; }
    iterator end_ptr(void) { return this->end; }
    iterator last_ptr(void) {
        return this->end;
    }
    iterator bound(void) {
        return this->end;
    }
    usize cap(void) { return count; }
    
    
    void* index(usize index)
    {
        #ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < this->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, this->count);
        #endif
        return (void*)(((uintptr)this->data) + (index * this->type_size));
    }
    
    bool empty() { return this->count == 0; }
};

template <typename T>
struct alignas(16) Array_Slice {
    usize count;
    T* data;
    
    inline usize size()
    {
        return this->count;
    }
    
    operator Array_Slice_Raw(void)
    {
        return {.count = this->count, .data = reinterpret_cast<void*>(this->data), .type_size = sizeof(T), .end =
            (void*)(((uintptr)this->data) + (this->count * sizeof(T)))
        };
    }
    
    typedef T* iterator;
    typedef const T* const_iterator;
    iterator begin_ptr(void) { return &this->data[0]; }
    iterator next_free_slot_ptr(void) { return &this->data[this->count]; }
    iterator end_ptr(void) { return next_free_slot_ptr(); }
    iterator last_ptr(void) { return &this->data[this->count - 1]; }
    iterator bound(void) { return &this->data[count]; }
    usize cap(void) { return count; }
    
    T& operator[](usize index)
    {
        #ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < this->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, this->count);
        #endif
        return this->data[index];
    }
    
    const T& operator[](usize index) const
    {
        #ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < this->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, this->count);
        #endif
        
        return this->data[index];
    }
    
    T* begin() { return this->begin_ptr(); }
    T* end() { return this->end_ptr(); }
    
    bool empty() { return this->count == 0; }
};
static_assert(std::is_standard_layout<Array_Slice<int>>::value && std::is_trivially_copyable<Array_Slice<int>>::value, "check that Array_Slice has standard layout and is trivially copyable");


TYPE_T_SIZE_N
struct  alignas(16) Array {
    usize count;
    T     data[N];
    
    inline usize size() const
    {
        return this->count;
    }
    
    inline operator Array_Slice<T>(void)
    {
        return Array_Slice<T>{this->count, this->data};
    }
    
    T& operator[](usize index)
    {
#ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < N, "Index %llu is out-of-bounds ranges 0..<%llu", index, N);
#endif
        return this->data[index];
    }
    
    const T& operator[](usize index) const
    {
#ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < N, "Index %llu is out-of-bounds ranges 0..<%llu", index, N);
#endif
        
        return this->data[index];
    }
    
    typedef T* iterator;
    typedef const T* const_iterator;
    iterator begin_ptr(void) { return &this->data[0]; }
    iterator next_free_slot_ptr(void) { return &this->data[this->count]; }
    iterator end_ptr(void) { return next_free_slot_ptr(); }
    iterator last_ptr(void) { return &this->data[this->count - 1]; }
    iterator bound(void) { return &this->data[N]; }
    usize cap(void) { return N; }
    
    T* begin() { return this->begin_ptr(); }
    T* end() { return this->next_free_slot_ptr(); }
    
    T* cbegin() const { return this->begin_ptr(); }
    T* cend() const { return this->next_free_slot_ptr(); }
    
    bool empty() { return this->count == 0; }
};
static_assert(std::is_standard_layout<Array<int, 1>>::value, "check that Array has standard layout");

TYPE_T_SIZE_N
usize byte_length(Array<T, N>* array)
{
    return sizeof(T) * N;
}

TYPE_T_SIZE_N
void append(Array<T, N>* array, T val)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count < N, "Array has reached maximum capacity %llu", N);
#endif
    
    array->data[array->count] = val;
    array->count += 1;
}
TYPE_T_SIZE_N
void append(Array<T, N>* array, T* val)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count < N, "Array has reached maximum capacity %llu", array->count);
#endif
    
    array->data[array->count] = *val;
    array->count += 1;
}

TYPE_T_SIZE_N
void push(Array<T, N>* array, T val)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count < N, "Array has reached maximum capacity %llu", array->count);
#endif
    
    array->data[array->count] = val;
    array->count += 1;
}
TYPE_T_SIZE_N
void push(Array<T, N>* array, T* val)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count < N, "Array has reached maximum capacity %llu", array->count);
#endif
    
    array->data[array->count] = *val;
    array->count += 1;
}



TYPE_T_SIZE_N
T* peek(Array<T, N>* array)
{
    if (array->count == 0) {
        return nullptr;
    }
    return &array->data[array->count - 1];
}

TYPE_T_SIZE_N
T pop(Array<T, N>* array)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count != 0, "cannot pop if empty");
#endif
    
    array->count -= 1;
    return array->data[array->count];
}

TYPE_T_SIZE_N
inline bool is_empty(Array<T, N>* array)
{
    return (array->count == 0);
}

TYPE_T_SIZE_N
void Array_init(Array<T, N>* array)
{
    array->count = 0;
}
TYPE_T_SIZE_N
void init(Array<T, N>* array)
{
    Array_init(array);
}

TYPE_T_SIZE_N
void swap(Array<T, N>* array, usize i, usize j)
{
    T val_at_i = array[i];
    array[i] = array[j];
    array[j] = val_at_i;
}

TYPE_T_SIZE_N
void clear(Array<T, N>* array)
{
    
#if defined(__OBJC__)
    if constexpr (std::is_same<T, id>::value) {
        const usize count = array->count;
        for (usize i = 0; i < count; i += 1) {
            (*array)[i] = nil;
        }
    }
#endif
    array->count = 0;
}

TYPE_T_SIZE_N
void ordered_remove(Array<T, N>* array, usize index);

TYPE_T_SIZE_N
void unordered_remove(Array<T, N>* array, usize index);

TYPE_T_SIZE_N
void increment_count(Array<T, N>* array, const usize count_increment);

//namespace mem {
//    inline mem::Allocator const& get_sys_context_array_allocator(void);
//}

#define ARRAY_GROW_FORMULA(x) (2*(x) + 8)
static_assert(ARRAY_GROW_FORMULA(0) > 0, "ARRAY_GROW FORMULA(0) SHOULD NOT BE 0");

TYPE_T
struct Dynamic_Array;

TYPE_T
void push(Dynamic_Array<T>* array, const T& val);

//TYPE_T
//void push(Dynamic_Array<T>* array, T val);

TYPE_T
void reserve(Dynamic_Array<T>* array, usize cap);

TYPE_T
void array__grow(Dynamic_Array<T>* array, usize min_cap);

TYPE_T
void resize(Dynamic_Array<T>* array, usize count);

TYPE_T
void set_capacity(Dynamic_Array<T>* array, usize capacity);

TYPE_T
void set_capacity(Dynamic_Array<T>* array, usize capacity, usize first_index, usize last_index_exclusive);

TYPE_T
void ordered_remove(Dynamic_Array<T>* array, usize index);

TYPE_T
void unordered_remove(Dynamic_Array<T>* array, usize index);

TYPE_T
void increment_count(Dynamic_Array<T>* array, const usize count_increment);

TYPE_T
void copy(Dynamic_Array<T>* array, Dynamic_Array<T> const& data, isize offset);
TYPE_T
void copy(Dynamic_Array<T>* array, Dynamic_Array<T> const& data, isize offset, usize count);

TYPE_T
void clone(Dynamic_Array<T>* to, Dynamic_Array<T>* from);

TYPE_T
void deinit(Dynamic_Array<T>* array);

TYPE_T
void assign(Dynamic_Array<T>* to, Dynamic_Array<T>* from);

struct Dynamic_Array_Header {
    usize            count;
    usize            cap;
    uint64           info;
    mem::Allocator*  allocator;
};


TYPE_T
struct alignas(16) Dynamic_Array {
    usize            count;
    usize            cap;
    uint64           info;
    mem::Allocator*  allocator;
    T*               data;
    
    inline usize size() const
    {
        return this->count;
    }
    
    operator Array_Slice<T>(void)
    {
        return Array_Slice<T>{this->count, this->data};
    }
    
    T& operator[](usize index)
    {
#ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < this->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, this->count);
#endif
        
        return this->data[index];
    }
    
    const T& operator[](usize index) const
    {
#ifndef NO_ARRAY_BOUNDS_CHECK
        ASSERT_MSG(index >= 0 && index < this->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, this->count);
#endif
        
        return this->data[index];
    }
    
    void set_size(usize count)
    {
        this->count = count;
    }
    
    void set_slot(usize index, T* val)
    {
        this->data[index] =  *val;
    }
    T& get_slot(usize index)
    {
        return this->data[index];
    }
    T* get_slot_ptr(usize index)
    {
        return &this->data[index];
    }
    
    typedef T* iterator;
    typedef const T* const_iterator;
    iterator next_free_slot_ptr(void) { return &this->data[this->count]; }
    iterator begin_ptr(void) { return &this->data[0]; }
    iterator end_ptr(void) { return next_free_slot_ptr(); }
    iterator last_ptr(void) { return &this->data[this->count - 1]; }
    
    const_iterator cnext_free_slot_ptr(void) const { return &this->data[this->count]; }
    const_iterator cbegin_ptr(void) const { return &this->data[0]; }
    const_iterator cend_ptr(void) const { return cnext_free_slot_ptr(); }
    const_iterator clast_ptr(void) const { return &this->data[this->count - 1]; }
    
    static Dynamic_Array<T> make(mem::Allocator& a);
    
    static Dynamic_Array<T> make(mem::Allocator& a, usize count);
    
    static Dynamic_Array<T> make(mem::Allocator& a, usize count, usize capacity);
    
    static Dynamic_Array<T> make_from_ptr(T* data, usize count, usize capacity);
    
    static Dynamic_Array<T> make_from_slice(Array_Slice<T>* array_slice);
    
    iterator begin() { return this->begin_ptr(); }
    iterator end() { return this->next_free_slot_ptr(); }
    
    const_iterator cbegin() const { return this->cbegin_ptr(); }
    const_iterator cend() const { return this->cnext_free_slot_ptr(); }
    
    const T& back() const { return *this->clast_ptr(); }
    const T& front() const { return *this->cbegin_ptr(); }
    
    
    void push_back(const T& val)
    {
        push(this, val);
    }
    

    void emplace_back(const T& val)
    {
        push(this, val);
    }
    
    void clear()
    {
        this->count = 0;
    }
    
    void resize(usize count)
    {
        mtt::resize(this, count);
    }
    
    void reserve(usize count)
    {
        mtt::reserve(this, count);
    }
    
    void assign_from(mtt::Dynamic_Array<T>* from)
    {
        mtt::assign(this, from);
    }
    
    void deinit()
    {
        mtt::deinit(this);
    }
    
    void clone_to(mtt::Dynamic_Array<T>* to)
    {
        mtt::clone(to, this);
    }
    
    bool empty() { return this->count == 0; }
};

static_assert(std::is_standard_layout<Dynamic_Array<int>>::value && std::is_trivially_copyable<Dynamic_Array<int>>::value, "check that Dynamic_Array has standard layout and is trivially copiable");

TYPE_T
usize byte_length(Dynamic_Array<T>* array)
{
    return sizeof(T) * array->count;
}

TYPE_T
void append(Dynamic_Array<T>* array, T val)
{
    if (array->cap < array->count + 1) {
        array__grow(array, 0);
    }
    
    array->data[array->count] = val;
    array->count += 1;
}
TYPE_T
void append(Dynamic_Array<T>* array, T* val)
{
    if (array->cap < array->count + 1) {
        array__grow(array, 0);
    }
    
    array->data[array->count] = *val;
    array->count += 1;
}


TYPE_T
void push(Dynamic_Array<T>* array, const T& val)
{
    if (array->cap < array->count + 1) {
        array__grow(array, 0);
    }
    
    array->data[array->count] = val;
    array->count += 1;
}

TYPE_T
T* peek(Dynamic_Array<T>* array)
{
    if (array->count == 0) {
        return nullptr;
    }
    return &array->data[array->count - 1];
}

TYPE_T
T pop(Dynamic_Array<T>* array)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(array->count != 0, "cannot pop if empty");
#endif
    
    array->count -= 1;
    return array->data[array->count];
}

TYPE_T
bool is_empty(Dynamic_Array<T>* array)
{
    return (array->count == 0);
}

TYPE_T
void init(Dynamic_Array<T>* array);
TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a);

//TYPE_T
//void init(Dynamic_Array<T>* array, usize count);
TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a, usize count);

TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a, usize count, usize capacity);
//TYPE_T
//void init(Dynamic_Array<T>* array, usize count, usize capacity);
TYPE_T
void init_from_ptr(Dynamic_Array<T>* array, T* data, usize count, usize capacity);

TYPE_T
void init_empty(Dynamic_Array<T>* array, mem::Allocator& a);


TYPE_T
void swap(Dynamic_Array<T>* array, usize i, usize j)
{
    T val_at_i = array[i];
    array[i] = array[j];
    array[j] = val_at_i;
}




TYPE_T
void clear(Dynamic_Array<T>* array)
{
    array->count = 0;
}

#if defined(__OBJC__)
template <>
inline void clear<id>(Dynamic_Array<id>* array)
{
    const usize count = array->count;
    for (usize i = 0; i < count; i += 1) {
        (*array)[i] = nil;
    }
    array->count = 0;
}
#endif




TYPE_T
Array_Slice<T> slice(Array_Slice<T>* array, usize i, usize j)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(i <= j && j < array->count, "Slice out-of-bounds >= %llu", array->count);
#endif
    
    return Array_Slice<T>{j - i, &array->data[i]};
}

TYPE_T_SIZE_N
Array_Slice<T> slice(Array<T, N>* array, usize i, usize j)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(i <= j && j < array->count, "Slice out-of-bounds >= %llu", array->count);
#endif
    
    return Array_Slice<T>{j - i, &array->data[i]};
}

TYPE_T
Array_Slice<T> slice(Dynamic_Array<T>* array, usize i, usize j)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT_MSG(i <= j && j < array->count, "Slice out-of-bounds >= %llu", array->count);
#endif
    
    return Array_Slice<T>{j - i, &array->data[i]};
}


// floating procedure API ////////////////////////////////////////////




TYPE_T_SIZE_N
void ordered_remove(Array<T, N>* array, usize index)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT(0 <= index && index < array->count);
#endif
    
    usize bytes = sizeof(T) * (array->count - (index + 1));
    memmove<T>(array->data + index, array->data + index + 1, bytes);
    array->count -= 1;
}

TYPE_T_SIZE_N
void unordered_remove(Array<T, N>* array, usize index)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
    ASSERT(0 <= index && index < array->count);
#endif
    
    usize n = array->count - 1;
    
    memmove<T>(array->data + index, array->data + n, sizeof(T));
    
    pop(array);
}

TYPE_T_SIZE_N
void increment_count(Array<T, N>* array, const usize count_increment)
{
    return;
}


// floating procedure API ////////////////////////////////////////////

TYPE_T
void deinit(T* _)
{
    (void)_;
}

TYPE_T
void deinit(Dynamic_Array<T>* array)
{

    for (usize i = 0; i < array->size(); i += 1) {
        deinit(&(*array)[i]);
    }
    if (array->allocator != nullptr) {
        if (array->allocator->deallocate != nullptr) {
            array->allocator->deallocate((void*)array->allocator, array->data, array->cap * sizeof(T));
        }
    }
    array->data = nullptr;
    array->count = 0;
    array->cap = 0;
}

TYPE_T
void assign(Dynamic_Array<T>* to, Dynamic_Array<T>* from)
{
    deinit(to);
    clone(to, from);
}

TYPE_T
void reserve(Dynamic_Array<T>* array, usize cap)
{
    if (array->cap < cap) {
        set_capacity(array, cap);
    }
}

TYPE_T
void array__grow(Dynamic_Array<T>* array, usize min_cap)
{
    usize new_cap = ARRAY_GROW_FORMULA(array->cap);
    if (new_cap < min_cap) {
        new_cap = min_cap;
    }
    set_capacity(array, new_cap);
}

TYPE_T
void resize(Dynamic_Array<T>* array, usize count)
{
    if (array->cap < count) {
        array__grow(array, count);
    }
    array->count = count;
}

TYPE_T
void set_capacity(Dynamic_Array<T>* array, usize capacity)
{
    if (capacity == array->cap) {
        return;
    }
    
    bool had_allocator = true;
    if (array->allocator == nullptr) {
        array->allocator = mem::get_main_allocator();
        had_allocator = false;
    }
    
    if (capacity < array->count) {
        resize(array, capacity);
    }
    
    T* new_data = nullptr;
    if (capacity > 0) {
        new_data = (T*)array->allocator->allocate((void*)array->allocator, sizeof(T) * capacity);
#if defined(__OBJC__)
        if constexpr (!std::is_same<T, id>::value) {
            mem::init_allocated<T>(new_data, capacity);
        }
#else
        
        mem::init_allocated<T>(new_data, capacity);
#endif
        memmove<T>(new_data, array->data, sizeof(T) * array->cap);
    }
    
    if (had_allocator) {
        array->allocator->deallocate((void*)array->allocator, (void*)array->data, array->cap * sizeof(T));
    }
    
    array->data = new_data;
    array->cap = capacity;
}

TYPE_T
void set_capacity(Dynamic_Array<T>* array, usize capacity, usize first_index, usize count)
{
    const usize old_cap = array->cap;
    bool had_allocator = true;
    if (array->allocator == nullptr) {
        array->allocator = mem::get_main_allocator();
        had_allocator = false;
    }
    
    T* new_data = nullptr;
    if (capacity > 0) {
        new_data = (T*)array->allocator->allocate((void*)array->allocator, sizeof(T) * capacity);
        
        if (first_index + count <= old_cap) {
#if defined(__OBJC__)
            if constexpr (!std::is_same<T, id>::value) {
                mem::init_allocated<T>(new_data, capacity);
            }
#else

            mem::init_allocated<T>(new_data, capacity);
#endif
        
            memmove<T>(new_data, &array->data[first_index], sizeof(T) * count);
        } else {
#if defined(__OBJC__)
            if constexpr (!std::is_same<T, id>::value) {
                mem::init_allocated<T>(new_data, capacity);
            }
#else
            mem::init_allocated<T>(new_data, capacity);
#endif
            
            usize diff = old_cap - first_index;
            memmove<T>(new_data, &array->data[first_index], sizeof(T) * (diff));
            memmove<T>(&new_data[diff], &array->data[0], sizeof(T) * (count - diff));
        }
    }
    
    if (had_allocator) {
        mem::deinit_deallocate_array<T>(array->allocator, array->data, array->cap);
    }
    
    array->data = new_data;
    array->cap = capacity;
}

TYPE_T
void ordered_remove(Dynamic_Array<T>* array, usize index)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
ASSERT_MSG(index >= 0 && index < array->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, array->count);
#endif
    
    usize bytes = sizeof(T) * (array->count - (index + 1));
    memmove<T>(array->data + index, array->data + index + 1, bytes);
    array->count -= 1;
}

TYPE_T
void unordered_remove(Dynamic_Array<T>* array, usize index)
{
#ifndef NO_ARRAY_BOUNDS_CHECK
ASSERT_MSG(index >= 0 && index < array->count, "Index %llu is out-of-bounds ranges 0..<%llu", index, array->count);
#endif
    
    usize n = array->count - 1;
    
    //memmove<T>(array->data + index, array->data + n, sizeof(T));
    (*array)[index] = (*array)[n];
    
    pop(array);
}

TYPE_T
void increment_count(Dynamic_Array<T>* array, const usize count_increment)
{
    const usize next_count = array->count + count_increment;
    while (array->cap < next_count) {
        array__grow(array, 0);
    }
    
    array->count += count_increment;
}


TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a)
{
    usize cap = ARRAY_GROW_FORMULA(0);
    init(array, a, 0, cap);
}
//TYPE_T
//void init(Dynamic_Array<T>* array)
//{
//    usize cap = ARRAY_GROW_FORMULA(0);
//    init(array, mem::get_sys_context_array_allocator(), 0, cap);
//}


TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a, usize count)
{
    init(array, a, count, count);
}
//TYPE_T
//void init(Dynamic_Array<T>* array, usize count)
//{
//    init(array, mem::get_sys_context_array_allocator(), count, count);
//}

//TYPE_T
//void init(Dynamic_Array<T>* array, usize count, usize capacity)
//{
//    init(array, mem::get_sys_context_array_allocator(), count, capacity);
//}
TYPE_T
void init(Dynamic_Array<T>* array, mem::Allocator& a, usize count, usize capacity)
{
    array->allocator = &a;
    array->data = nullptr;
    if (capacity > 0) {
        array->data = (T*)array->allocator->allocate((void*)&a, sizeof(T) * capacity);
        ASSERT_MSG(array->data != nullptr, "allocation failed\n");
        

#if defined(__OBJC__)
            if constexpr (!std::is_same<T, id>::value) {
                mem::init_allocated<T>(&array->data[0], capacity);
            }
#else
            mem::init_allocated<T>(&array->data[0], capacity);
#endif
        
    }
    array->count = (count > capacity) ? capacity : count;
    array->cap   = capacity;
    array->info  = 0;
}
TYPE_T
void init_from_ptr(Dynamic_Array<T>* array, T* data, usize count, usize capacity)
{
    array->data  = data;
    array->count = count;
    array->cap   = capacity;
    
    array->allocator = nullptr;
    array->info = 0;
}

TYPE_T
void init_empty(Dynamic_Array<T>* array, mem::Allocator& a)
{
    array->allocator = &a;
    array->data = nullptr;
    
    array->count = 0;
    array->cap   = 0;
    array->info  = 0;
}



TYPE_T
Dynamic_Array<T> Dynamic_Array<T>::make(mem::Allocator& a)
{
    Dynamic_Array<T> array;
    mtt::init(&array, a);
    
    return array;
}


TYPE_T
Dynamic_Array<T> Dynamic_Array<T>::make(mem::Allocator& a, usize count)
{
    Dynamic_Array<T> array;
    mtt::init(&array, a, count, count);
    
    return array;
}


TYPE_T
Dynamic_Array<T> Dynamic_Array<T>::make(mem::Allocator& a, usize count, usize capacity)
{
    Dynamic_Array<T> array;
    mtt::init(&array, a, count, capacity);
    
    return array;
}

TYPE_T
Dynamic_Array<T> Dynamic_Array<T>::make_from_ptr(T* data, usize count, usize capacity)
{
    Dynamic_Array<T> array = {};
    
    init_from_ptr(&array, data, count, capacity);
    
    return array;
}

TYPE_T
Dynamic_Array<T> Dynamic_Array<T>::make_from_slice(Array_Slice<T>* array_slice)
{
    Dynamic_Array<T> array = {};
    
    init_from_ptr(&array, array_slice->count, array_slice->count);
    
    return array;
}


TYPE_T
void copy(Dynamic_Array<T>* array, Dynamic_Array<T> const& data, isize offset)
{
    memmove<T>(array->data + offset, data.data, sizeof(T) * data.count);
}
TYPE_T
void copy(Dynamic_Array<T>* array, Dynamic_Array<T> const& data, isize offset, usize count)
{
    memmove<T>(array->data + offset, data.data, sizeof(T) * MIN(data.count, count));
}

TYPE_T
void clone(T* to, T* from)
{
    // no operation
}

template <typename T>
void clone(Dynamic_Array<T>* to, Dynamic_Array<T>* from)
{
    mtt::init(to, *from->allocator, from->size(), from->cap);
    std::copy(from->begin(), from->end(), to->begin());
    for (usize i = 0; i < from->size(); i += 1) {
        clone(&(*to)[i], &(*from)[i]);
    }
}



template <typename T>
Array_Slice<T> get_array(void *base, mem::Offset_Array<T> array, usize *length) {
    if (length) *length = array.length;
    
    
    Array_Slice<T> slice;
    slice.count = array.length;
    slice.data = (T *)((char *)base  + array.offset);
    
    
    return slice;
}


}

#endif // MTT_ARRAY_CPP

